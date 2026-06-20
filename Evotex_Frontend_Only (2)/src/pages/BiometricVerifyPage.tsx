import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, CheckCircle, ScanFace, Fingerprint, Loader2, Camera, AlertCircle } from 'lucide-react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import api from '../api';

type AssertionOptions = Parameters<typeof startAuthentication>[0]['optionsJSON'];
type RegistrationOptions = Parameters<typeof startRegistration>[0]['optionsJSON'];

function extractMsg(err: unknown, fallback: string): string {
  const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return apiMsg || (err as { message?: string })?.message || fallback;
}

export default function BiometricVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'vote' ? 'vote' : 'register';
  const electionId = searchParams.get('electionId');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fingerprintStatus, setFingerprintStatus] = useState<'scanning' | 'verified'>('scanning');
  const [faceStatus, setFaceStatus] = useState<'idle' | 'scanning' | 'verified' | 'failed'>('idle');
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Vote casting: skip mock fingerprint wait and go straight to webcam face step.
  useEffect(() => {
    if (mode === 'vote') {
      setFingerprintStatus('verified');
      setStep(2);
    }
  }, [mode]);

  // Fingerprint step — unchanged mock flow (do not modify).
  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => {
        setFingerprintStatus('verified');
        setTimeout(() => setStep(2), 800);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    return stream;
  };

  const handleRegisterFace = async () => {
    setError('');
    setLoading(true);
    setFaceStatus('scanning');

    try {
      await startCamera();

      const optionsRes = await api.post('/biometric/face/register-options');
      const options = optionsRes.data.options as RegistrationOptions;

      const credential = await startRegistration({ optionsJSON: options });

      await api.post('/biometric/face/register-verify', { credential });

      stopCamera();
      setFaceRegistered(true);
      setFaceStatus('verified');
      setTimeout(() => setStep(3), 800);
    } catch (err: unknown) {
      stopCamera();
      setFaceStatus('failed');
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError') {
        setError('Camera or security key access was denied. Allow camera permission and try again.');
      } else {
        setError(extractMsg(err, 'Face registration failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFaceForVote = async () => {
    setError('');
    setLoading(true);
    setFaceStatus('scanning');

    try {
      await startCamera();

      const optionsRes = await api.post('/biometric/face/auth-options');
      const options = optionsRes.data.options as AssertionOptions;

      const rpID = window.location.hostname;
      console.log('Using RP ID:', rpID, 'Origin:', window.location.origin);

      const assertion = await startAuthentication({ optionsJSON: options });

      const verifyRes = await api.post('/biometric/face/auth-verify', { credential: assertion });

      stopCamera();
      setFaceStatus('verified');
      sessionStorage.setItem('evotex_face_verified', '1');

      const redirect = verifyRes.data.redirect || '/candidate-page';
      if (electionId) {
        navigate(`/elections/${electionId}/vote?faceVerified=1`, { replace: true });
      } else {
        navigate(redirect, { replace: true });
      }
    } catch (err: unknown) {
      stopCamera();
      setFaceStatus('failed');
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError') {
        setError('Camera access was denied. Face verification failed.');
      } else {
        setError(extractMsg(err, 'Face verification failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const isVoteMode = mode === 'vote';

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4 py-12">
      <style>{`
        @keyframes pulseRing { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes pulseRing2 { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.7); opacity: 0; } }
        @keyframes drawCheck { 0% { stroke-dashoffset: 48; } 100% { stroke-dashoffset: 0; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes scanLine { 0% { top: 20%; } 50% { top: 70%; } 100% { top: 20%; } }
        .pulse-ring { animation: pulseRing 2s ease-out infinite; }
        .pulse-ring-2 { animation: pulseRing2 2s ease-out 0.5s infinite; }
        .draw-check { stroke-dasharray: 48; stroke-dashoffset: 48; animation: drawCheck 0.6s ease-out 0.3s forwards; }
        .scale-in { animation: scaleIn 0.4s ease-out; }
        .scan-line { animation: scanLine 2s ease-in-out infinite; }
      `}</style>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-[#bbf7d0] shadow-sm overflow-hidden">
          <div className="h-1.5 bg-[#16a34a] rounded-t-2xl" />

          <div className="px-8 py-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="bg-[#16a34a] p-1.5 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>E-Votex</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {isVoteMode ? 'Face Verification for Voting' : 'Face Recognition Enrollment'}
            </h2>
            <p className="text-[#6b7280] text-sm text-center mb-6">
              {isVoteMode
                ? 'Use your webcam security key to verify your face before choosing a candidate.'
                : 'Register your face using the webcam (cross-platform authenticator).'}
            </p>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-[#16a34a] text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {fingerprintStatus === 'verified' ? <CheckCircle className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
                </div>
                <span className="text-xs mt-1.5 font-medium text-[#6b7280]">Fingerprint</span>
              </div>
              <div className={`h-0.5 w-12 ${step >= 2 ? 'bg-[#16a34a]' : 'bg-gray-200'}`} />
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-[#16a34a] text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {faceStatus === 'verified' ? <CheckCircle className="w-5 h-5" /> : <ScanFace className="w-5 h-5" />}
                </div>
                <span className="text-xs mt-1.5 font-medium text-[#6b7280]">Face Scan</span>
              </div>
            </div>

            {/* Step 1: Fingerprint (unchanged mock) */}
            {step === 1 && (
              <div className="flex flex-col items-center">
                <div className="relative flex items-center justify-center w-32 h-32 mb-6">
                  {fingerprintStatus === 'scanning' && (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-green-300 pulse-ring" />
                      <div className="absolute inset-0 rounded-full border-2 border-green-200 pulse-ring-2" />
                    </>
                  )}
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${fingerprintStatus === 'verified' ? 'bg-[#f0fdf4]' : 'bg-green-50'}`}>
                    {fingerprintStatus === 'verified' ? (
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="scale-in">
                        <path className="draw-check" d="M12 24 L20 32 L36 16" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <Fingerprint className="w-10 h-10 text-[#16a34a] animate-pulse" />
                    )}
                  </div>
                </div>
                <p className="text-gray-900 font-semibold mb-1">
                  {fingerprintStatus === 'verified' ? 'Fingerprint Verified!' : 'Place your finger on the scanner'}
                </p>
                <p className="text-[#6b7280] text-sm">
                  {fingerprintStatus === 'verified' ? 'Proceeding to face scan...' : 'Scanning...'}
                </p>
                {fingerprintStatus === 'scanning' && <Loader2 className="w-5 h-5 text-[#16a34a] animate-spin mt-4" />}
              </div>
            )}

            {/* Step 2: Webcam Face Recognition */}
            {step === 2 && (
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-xs mb-4 overflow-hidden rounded-2xl border-2 border-[#16a34a] bg-gray-900 aspect-[4/3]">
                  <video
                    id="face-camera"
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`h-full w-full object-cover ${faceStatus === 'scanning' || loading ? 'block' : 'hidden'}`}
                  />
                  {faceStatus !== 'scanning' && !loading && faceStatus !== 'verified' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-50">
                      <Camera className="h-12 w-12 text-[#16a34a]" />
                    </div>
                  )}
                  {faceStatus === 'scanning' && (
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute left-0 right-0 h-0.5 bg-[#16a34a] scan-line" />
                    </div>
                  )}
                  {faceStatus === 'verified' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#f0fdf4]">
                      <CheckCircle className="h-14 w-14 text-[#16a34a]" />
                    </div>
                  )}
                </div>

                <p className="text-gray-900 font-semibold mb-1">
                  {faceStatus === 'verified'
                    ? 'Face Verified!'
                    : faceStatus === 'failed'
                      ? 'Face verification failed'
                      : isVoteMode
                        ? 'Look at the camera to verify your face'
                        : 'Position your face in the camera frame'}
                </p>
                <p className="text-[#6b7280] text-sm text-center mb-4">
                  {isVoteMode
                    ? 'Uses webcam + cross-platform WebAuthn (not phone fingerprint sensor).'
                    : 'HTTPS required. Uses cross-platform authenticator with your webcam.'}
                </p>

                {faceStatus !== 'verified' && (
                  <button
                    type="button"
                    onClick={isVoteMode ? handleVerifyFaceForVote : handleRegisterFace}
                    disabled={loading}
                    className="w-full bg-[#16a34a] hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3.5 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isVoteMode ? 'Verifying face...' : 'Registering face...'}
                      </>
                    ) : faceStatus === 'failed' ? (
                      'Retry Face Verification'
                    ) : isVoteMode ? (
                      'Verify Face for Voting'
                    ) : (
                      'Register FACE'
                    )}
                  </button>
                )}

                {faceStatus === 'verified' && !isVoteMode && (
                  <p className="text-sm text-[#16a34a] font-medium">Face registered successfully</p>
                )}
              </div>
            )}

            {/* Step 3: Complete (register mode) */}
            {step === 3 && !isVoteMode && (
              <div className="flex flex-col items-center gap-5 py-4 scale-in">
                <div className="w-24 h-24 bg-[#f0fdf4] rounded-full flex items-center justify-center border-2 border-[#bbf7d0]">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                    <path className="draw-check" d="M14 28 L24 38 L42 18" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-[#16a34a]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {faceRegistered ? 'Face Registered!' : 'Identity Verified!'}
                  </h2>
                  <p className="text-[#6b7280] text-sm mt-1">Webcam face recognition is ready for voting.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-[#16a34a] hover:bg-green-700 text-white font-semibold rounded-xl px-6 py-3.5 transition-all shadow-sm hover:shadow-md"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
