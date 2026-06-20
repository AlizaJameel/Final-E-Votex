import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  Fingerprint,
  Camera,
  XCircle,
} from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import api, { getSessionUser, updateSessionCnic } from '../../api';
import VoterLayout from '../../components/VoterLayout';
import { formatCnicInput, isValidCnic, cnicValidationMessage, cnicToDigits } from '../../utils/cnic';
import { isMobileDevice } from '../../utils/device';
import { captureFaceFromVideo } from '../../utils/faceCapture';

type AssertionOptions = Parameters<typeof startAuthentication>[0]['optionsJSON'];

function extractMsg(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

interface Candidate {
  id: number;
  name: string;
  party: string;
  photoUrl: string;
  symbol: string;
  voteCount: number;
}

interface Election {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  candidates: Candidate[];
}

const STEPS = [
  { num: 1, label: 'CNIC' },
  { num: 2, label: 'FINGERPRINT' },
  { num: 3, label: 'FACE RECOGNITION' },
];

const CNIC_USAGE_KEY = 'evotex_voter_cnic_usage';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'failed';

function markCnicUsed(electionId: number, cnic: string) {
  const digits = cnicToDigits(cnic);
  const all = JSON.parse(localStorage.getItem(CNIC_USAGE_KEY) || '{}') as Record<string, string[]>;
  const key = String(electionId);
  const list = all[key] || [];
  if (!list.includes(digits)) {
    all[key] = [...list, digits];
    localStorage.setItem(CNIC_USAGE_KEY, JSON.stringify(all));
  }
}

export default function VotingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [cnic, setCnic] = useState('');
  const [cnicError, setCnicError] = useState('');
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [fpStatus, setFpStatus] = useState<ScanStatus>('idle');
  const [faceStatus, setFaceStatus] = useState<ScanStatus>('idle');
  const [verifyingCnic, setVerifyingCnic] = useState(false);

  // Step-up chained tokens + the WebAuthn options issued for the next step.
  const [cnicToken, setCnicToken] = useState<string | null>(null);
  const [fingerprintToken, setFingerprintToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fpOptions, setFpOptions] = useState<AssertionOptions | null>(null);
  const [faceOptions, setFaceOptions] = useState<AssertionOptions | null>(null);

  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);

  const stopFaceCamera = useCallback(() => {
    faceStreamRef.current?.getTracks().forEach((track) => track.stop());
    faceStreamRef.current = null;
    if (faceVideoRef.current) faceVideoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopFaceCamera(), [stopFaceCamera]);

  useEffect(() => {
    const session = getSessionUser();
    if (session?.cnic && isValidCnic(session.cnic)) {
      setCnic(session.cnic);
    }
  }, []);

  useEffect(() => {
    const onUserUpdated = () => {
      const session = getSessionUser();
      if (session?.cnic) setCnic(session.cnic);
    };
    window.addEventListener('evotex-user-updated', onUserUpdated);
    return () => window.removeEventListener('evotex-user-updated', onUserUpdated);
  }, []);

  useEffect(() => {
    async function fetchElection() {
      try {
        const response = await api.get(`/elections/${id}`);
        setElection(response.data);
      } catch {
        setError('Failed to load election details');
      } finally {
        setLoading(false);
      }
    }
    fetchElection();
  }, [id]);

  // Guard: voters must have both FINGERPRINT and FACE RECOGNITION enrolled.
  useEffect(() => {
    async function checkEnrollment() {
      try {
        const res = await api.get('/auth/webauthn/stepup/status');
        if (!res.data.ready) {
          navigate('/voter/enroll-biometrics', { replace: true });
        }
      } catch {
        navigate('/voter/enroll-biometrics', { replace: true });
      }
    }
    checkEnrollment();
  }, [navigate]);

  useEffect(() => {
    if (step !== 2) {
      setFpStatus('idle');
    }
    if (step !== 3) {
      setFaceStatus('idle');
    }
  }, [step]);

  const selectedCandidate = election?.candidates.find(c => c.id === selected);
  const onVoteStep = step >= 4;

  const handleCnicChange = (raw: string) => {
    if (!/^[0-9-]*$/.test(raw)) return;
    setCnic(formatCnicInput(raw));
    if (cnicError) setCnicError('');
  };

  // Step 1 — CNIC verification (matched server-side against the registered CNIC).
  const handleVerifyCnic = async () => {
    const msg = cnicValidationMessage(cnic);
    if (msg) {
      setCnicError(msg);
      return;
    }

    setCnicError('');
    setVerifyingCnic(true);
    try {
      const res = await api.post('/auth/vote/verify-cnic', { cnic });
      updateSessionCnic(cnic);
      setCnicToken(res.data.cnic_token);
      setFpOptions(res.data.options);
      setStep(2);
    } catch (err) {
      setCnicError(extractMsg(err) || 'CNIC verification failed.');
    } finally {
      setVerifyingCnic(false);
    }
  };

  // Step 2 — FINGERPRINT verification via the platform authenticator.
  const handleVerifyFingerprint = async () => {
    if (fpStatus === 'scanning' || !fpOptions || !cnicToken) return;
    setError('');
    setFpStatus('scanning');
    try {
      let token = cnicToken;
      let options = fpOptions;

      // WebAuthn challenges are single-use; fetch a fresh one on retry.
      if (fpStatus === 'failed') {
        const refresh = await api.post('/auth/webauthn/stepup/refresh-fingerprint-options', {
          cnic_token: cnicToken,
        });
        token = refresh.data.cnic_token;
        options = refresh.data.options;
        setCnicToken(token);
        setFpOptions(options);
      }

      const assertion = await startAuthentication({ optionsJSON: options });
      const res = await api.post('/auth/webauthn/stepup/verify-fingerprint', {
        cnic_token: token,
        assertion,
      });
      setFingerprintToken(res.data.fingerprint_token);
      setFaceOptions(res.data.options);
      setFpStatus('success');
      setTimeout(() => setStep(3), 800);
    } catch (err) {
      setFpStatus('failed');
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError') {
        setError('Biometric prompt was cancelled or timed out. Tap Retry and try again.');
      } else {
        setError(extractMsg(err) || 'FINGERPRINT verification failed. Please try again.');
      }
    }
  };

  // Step 3 — FACE RECOGNITION (front camera on mobile; webcam + WebAuthn on desktop).
  const handleVerifyFace = async () => {
    if (faceStatus === 'scanning' || !fingerprintToken) return;
    setError('');
    setFaceStatus('scanning');

    const mobile = isMobileDevice();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        await faceVideoRef.current.play();
      }

      if (mobile) {
        const { dHash } = await captureFaceFromVideo(faceVideoRef.current!);
        await api.post('/biometric/face/auth-options', { mobile: true });
        const res = await api.post('/biometric/face/auth-verify', {
          face_d_hash: dHash,
          fingerprint_token: fingerprintToken,
          mobile: true,
        });
        stopFaceCamera();
        setSessionToken(res.data.session_token);
        setFaceStatus('success');
        setTimeout(() => setStep(4), 800);
        return;
      }

      const optionsRes = await api.post('/biometric/face/auth-options', { mobile: false });
      const assertion = await startAuthentication({ optionsJSON: optionsRes.data.options });

      const res = await api.post('/biometric/face/auth-verify', {
        credential: assertion,
        fingerprint_token: fingerprintToken,
      });

      stopFaceCamera();
      setSessionToken(res.data.session_token);
      setFaceStatus('success');
      setTimeout(() => setStep(4), 800);
    } catch (err) {
      stopFaceCamera();
      setFaceStatus('failed');
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError') {
        setError('Allow camera access and ensure your face is visible in the frame.');
      } else {
        setError(extractMsg(err) || 'Face verification failed');
      }
    }
  };

  const handleCastVote = async () => {
    if (!election || !selected || !isValidCnic(cnic) || !sessionToken) return;

    setSubmitting(true);
    try {
      await api.post('/votes', {
        electionId: election.id,
        candidateId: selected,
        cnic,
        session_token: sessionToken,
      });
      markCnicUsed(election.id, cnic);
      const cast = JSON.parse(localStorage.getItem('evotex_votes_cast') || '[]');
      if (!cast.includes(election.id)) {
        localStorage.setItem('evotex_votes_cast', JSON.stringify([...cast, election.id]));
      }
      setShowConfirm(false);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to cast vote');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <VoterLayout title="Cast Your Vote">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evotex-primary" />
        </div>
      </VoterLayout>
    );
  }

  if (!election) {
    return (
      <VoterLayout title="Cast Your Vote">
        <div className="text-center py-12">
          <p className="text-evotex-muted font-medium">Election not found</p>
          <Link to="/elections" className="text-evotex-primary hover:underline mt-2 inline-block">
            Back to Elections
          </Link>
        </div>
      </VoterLayout>
    );
  }

  if (success) {
    return (
      <VoterLayout title="Vote Confirm">
        <div className="evotex-card max-w-lg mx-auto p-8 sm:p-12 text-center">
          <div className="w-24 h-24 bg-evotex-mint rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-evotex-primary" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-evotex-primary mb-3">Vote Cast Successfully</h1>
          <p className="text-evotex-muted mb-8 leading-relaxed">
            Your vote has been recorded for {election.title}. Thank you for participating.
          </p>
          <Link to={`/results/${election.id}`} className="block w-full evotex-btn-primary">
            View Result
          </Link>
        </div>
      </VoterLayout>
    );
  }

  return (
    <VoterLayout title="Cast Your Vote">
      <style>{`
        @keyframes votePulseRing {
          0% { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes voteScanLine {
          0% { top: 12%; }
          50% { top: 78%; }
          100% { top: 12%; }
        }
        @keyframes voteFpLine {
          0% { transform: translateY(-100%); opacity: 0.3; }
          50% { opacity: 1; }
          100% { transform: translateY(200%); opacity: 0.3; }
        }
        @keyframes voteCornerPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .vote-pulse-ring { animation: votePulseRing 2s ease-out infinite; }
        .vote-pulse-ring-2 { animation: votePulseRing 2s ease-out 0.6s infinite; }
        .vote-face-scan-line { animation: voteScanLine 2.2s ease-in-out infinite; }
        .vote-fp-scan-line { animation: voteFpLine 1.8s ease-in-out infinite; }
        .vote-corner-pulse { animation: voteCornerPulse 1.5s ease-in-out infinite; }
      `}</style>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">{election.title}</h1>
      <p className="text-evotex-muted text-sm mb-5">{election.description}</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-evotex-mint border border-evotex-mint-border rounded-xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-evotex-muted">
          <CalendarDays className="w-4 h-4 text-evotex-primary shrink-0" />
          Ends {new Date(election.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-2 text-sm text-evotex-muted">
          <Users className="w-4 h-4 text-evotex-primary shrink-0" />
          {election.candidates.length} Candidates
        </div>
      </div>

      {!onVoteStep && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {STEPS.map(s => {
            const active = step === s.num;
            const done = step > s.num;
            return (
              <div
                key={s.num}
                className={`rounded-xl border p-4 text-center transition ${
                  active ? 'border-evotex-primary bg-evotex-mint' : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`mx-auto mb-2 h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    done
                      ? 'bg-evotex-primary text-white'
                      : active
                        ? 'border-2 border-evotex-primary text-evotex-primary'
                        : 'border-2 border-evotex-mint-border text-evotex-primary'
                  }`}
                >
                  {done ? '✓' : s.num}
                </div>
                <p className="text-sm font-semibold text-gray-900">{s.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <div className="evotex-card p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Step 1: Enter CNIC</h2>
          <p className="text-sm text-evotex-muted mb-5">
            Enter your CNIC in format XXXXX-XXXXXXX-X. It must match the CNIC registered to your account.
          </p>
          <label htmlFor="cnic-input" className="block text-sm font-semibold text-gray-700 mb-2">
            CNIC Number
          </label>
          <input
            id="cnic-input"
            type="text"
            inputMode="numeric"
            maxLength={15}
            value={cnic}
            onChange={e => handleCnicChange(e.target.value)}
            className="evotex-input w-full tracking-widest font-mono text-lg"
            autoComplete="off"
          />
          <p className="text-xs text-evotex-muted mt-2">Format: 5 digits - 7 digits - 1 digit</p>
          {cnicError && (
            <p className="text-sm text-red-600 mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {cnicError}
            </p>
          )}
          <button
            type="button"
            onClick={handleVerifyCnic}
            disabled={verifyingCnic}
            className="mt-6 w-full evotex-btn-primary py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {verifyingCnic ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>) : 'Verify CNIC'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="evotex-card p-6 mb-6 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Step 2: FINGERPRINT Verification</h2>
          <p className="text-sm text-evotex-muted mb-6">Place finger on sensor for FINGERPRINT to verify your identity.</p>

          <div className="relative flex items-center justify-center w-36 h-36 mx-auto mb-6">
            {fpStatus === 'scanning' && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-evotex-primary vote-pulse-ring" />
                <div className="absolute inset-2 rounded-full border-2 border-green-300 vote-pulse-ring-2" />
              </>
            )}
            <div
              className={`relative w-28 h-28 rounded-full flex items-center justify-center overflow-hidden ${
                fpStatus === 'success'
                  ? 'bg-evotex-mint'
                  : fpStatus === 'failed'
                    ? 'bg-red-50'
                    : 'bg-evotex-mint/60'
              }`}
            >
              {fpStatus === 'scanning' && (
                <div className="absolute inset-x-4 h-1 bg-evotex-primary/70 rounded vote-fp-scan-line" />
              )}
              {fpStatus === 'success' ? (
                <CheckCircle className="w-14 h-14 text-evotex-primary" />
              ) : fpStatus === 'failed' ? (
                <XCircle className="w-14 h-14 text-red-500" />
              ) : (
                <Fingerprint
                  className={`w-14 h-14 text-evotex-primary ${fpStatus === 'scanning' ? 'animate-pulse' : ''}`}
                />
              )}
            </div>
          </div>

          {fpStatus === 'scanning' && (
            <p className="text-evotex-primary font-semibold mb-1 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning Fingerprint...
            </p>
          )}
          {fpStatus === 'success' && (
            <p className="text-evotex-primary font-semibold mb-1">FINGERPRINT Verified Successfully</p>
          )}
          {fpStatus === 'failed' && (
            <>
              <p className="text-red-600 font-semibold mb-1">FINGERPRINT Verification Failed</p>
              <p className="text-sm text-evotex-muted mb-4">Please try again with a clear finger placement.</p>
            </>
          )}
          {fpStatus === 'idle' && (
            <p className="text-sm text-evotex-muted mb-4">Press the button below to verify your FINGERPRINT.</p>
          )}

          {fpStatus !== 'success' && (
            <button
              type="button"
              onClick={handleVerifyFingerprint}
              disabled={fpStatus === 'scanning'}
              className="w-full evotex-btn-primary py-3 text-sm disabled:opacity-60"
            >
              {fpStatus === 'scanning' ? 'Verifying...' : fpStatus === 'failed' ? 'Retry Verification' : 'Verify FINGERPRINT'}
            </button>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="evotex-card p-6 mb-6 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Step 3: FACE RECOGNITION Verification</h2>
          <p className="text-sm text-evotex-muted mb-2">
            Look at your front camera — your face will be scanned (not your fingerprint).
          </p>
          <p className="text-xs text-evotex-muted mb-6 italic">
            {isMobileDevice()
              ? 'Mobile: uses your phone front camera only.'
              : 'Desktop: webcam + security key.'}
          </p>

          <div className="relative w-56 h-56 mx-auto mb-6 overflow-hidden rounded-2xl border-2 border-evotex-primary bg-gray-900">
            <video
              id="face-camera"
              ref={faceVideoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover ${faceStatus === 'scanning' ? 'block' : 'hidden'}`}
            />
            {faceStatus !== 'scanning' && (
              <div
                className={`relative flex h-full w-full items-center justify-center ${
                  faceStatus === 'failed'
                    ? 'bg-red-50'
                    : faceStatus === 'success'
                      ? 'bg-evotex-mint'
                      : 'bg-gray-900/5'
                }`}
              >
                {faceStatus === 'success' ? (
                  <CheckCircle className="w-16 h-16 text-evotex-primary" />
                ) : faceStatus === 'failed' ? (
                  <XCircle className="w-16 h-16 text-red-500" />
                ) : (
                  <Camera className="w-16 h-16 text-evotex-primary" />
                )}
              </div>
            )}
            {faceStatus === 'scanning' && (
              <div className="pointer-events-none absolute left-3 right-3 h-0.5 bg-evotex-primary shadow-[0_0_12px_#16a34a] vote-face-scan-line" />
            )}
          </div>

          {faceStatus === 'scanning' && (
            <p className="text-evotex-primary font-semibold mb-1 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning Face...
            </p>
          )}
          {faceStatus === 'success' && (
            <p className="text-evotex-primary font-semibold mb-1">FACE RECOGNITION Verified Successfully</p>
          )}
          {faceStatus === 'failed' && (
            <>
              <p className="text-red-600 font-semibold mb-1">Face verification failed</p>
              <p className="text-sm text-evotex-muted mb-4">Allow camera permission and ensure your face is visible.</p>
            </>
          )}
          {faceStatus === 'idle' && (
            <p className="text-sm text-evotex-muted mb-4">Tap below to open the camera and verify your face.</p>
          )}

          {faceStatus !== 'success' && (
            <button
              type="button"
              onClick={handleVerifyFace}
              disabled={faceStatus === 'scanning'}
              className="w-full evotex-btn-primary py-3 text-sm disabled:opacity-60"
            >
              {faceStatus === 'scanning' ? 'Verifying...' : faceStatus === 'failed' ? 'Retry Face Verification' : isMobileDevice() ? 'Verify FACE' : 'Verify FACE (Webcam)'}
            </button>
          )}
        </div>
      )}

      {step >= 4 && (
        <>
          <div className="rounded-2xl border border-evotex-mint-border bg-evotex-mint p-5 mb-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-evotex-primary text-white flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-green-800">Verification Successful</p>
              <p className="text-sm text-green-800/90">You may now choose your candidate and confirm your vote.</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-1">Choose your candidate</h2>
          <p className="text-sm text-evotex-muted mb-5">
            Select one of the party candidates and proceed to cast your vote.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {election.candidates.map(c => {
              const isSelected = selected === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    isSelected ? 'border-evotex-primary bg-evotex-mint/40' : 'border-gray-200 bg-white hover:border-evotex-mint-border'
                  }`}
                >
                  {c.photoUrl && (
                    <img src={c.photoUrl} alt={c.name} className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{c.name}</p>
                    <p className="text-sm text-evotex-primary font-medium">{c.party}</p>
                    <p className="text-xs text-evotex-muted mt-1">Symbol: {c.symbol}</p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-evotex-primary bg-evotex-primary' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => selected && sessionToken && setShowConfirm(true)}
            disabled={!selected || !sessionToken}
            className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${
              selected && sessionToken ? 'evotex-btn-primary' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {!sessionToken
              ? 'Complete all 3 verifications first'
              : selected
                ? `Cast Vote for ${selectedCandidate?.name}`
                : 'Select a candidate to vote'}
          </button>
        </>
      )}

      {showConfirm && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !submitting && setShowConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 bg-evotex-primary rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Confirm Your Vote</h2>
            </div>
            <div className="bg-evotex-mint border border-evotex-mint-border rounded-xl p-4 mb-4 text-center">
              {selectedCandidate.photoUrl && (
                <img
                  src={selectedCandidate.photoUrl}
                  alt={selectedCandidate.name}
                  className="mx-auto mb-3 h-24 w-24 rounded-xl object-cover"
                />
              )}
              <p className="font-bold text-evotex-primary text-lg">{selectedCandidate.name}</p>
              <p className="text-sm text-evotex-muted">{selectedCandidate.party}</p>
            </div>
            <p className="text-sm text-evotex-muted text-center mb-6">
              This action cannot be undone. Confirm to submit your vote.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="w-full border border-gray-200 text-gray-600 font-semibold rounded-xl py-2.5 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCastVote}
                disabled={submitting}
                className="w-full evotex-btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                  </>
                ) : (
                  'Confirm Vote'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </VoterLayout>
  );
}
