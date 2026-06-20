import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Camera, CheckCircle, Loader2, CreditCard } from 'lucide-react';
import api, { updateSessionCnic } from '../../api';
import { formatCnicInput, isValidCnic } from '../../utils/cnic';
import { isMobileDevice } from '../../utils/device';
import { captureFaceFromVideo } from '../../utils/faceCapture';

type CredentialStatus = {
  FINGERPRINT: boolean;
  'FACE RECOGNITION': boolean;
};

type Label = 'FINGERPRINT' | 'FACE RECOGNITION';

function extractMsg(err: unknown, fallback: string): string {
  const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return apiMsg || (err as { message?: string })?.message || fallback;
}

export default function EnrollBiometricsPage() {
  const [cnic, setCnic] = useState('');
  const [cnicVerified, setCnicVerified] = useState(false);
  const [cnicLoading, setCnicLoading] = useState(false);
  const [cnicError, setCnicError] = useState('');

  const [status, setStatus] = useState<CredentialStatus>({ FINGERPRINT: false, 'FACE RECOGNITION': false });
  const [loading, setLoading] = useState({ FINGERPRINT: false, 'FACE RECOGNITION': false });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);

  const stopFaceCamera = useCallback(() => {
    faceStreamRef.current?.getTracks().forEach((track) => track.stop());
    faceStreamRef.current = null;
    if (faceVideoRef.current) faceVideoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => stopFaceCamera();
  }, [stopFaceCamera]);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/auth/webauthn/stepup/status');
      const registered: string[] = res.data.registered || [];
      setStatus({
        FINGERPRINT: registered.includes('FINGERPRINT'),
        'FACE RECOGNITION': registered.includes('FACE RECOGNITION'),
      });
      setCnicVerified(Boolean(res.data.cnic_verified));
    } catch {
      setError('Failed to load enrollment status');
    }
  };

  const verifyCnic = async () => {
    setCnicError('');
    if (!isValidCnic(cnic)) {
      setCnicError('Enter a valid CNIC in format XXXXX-XXXXXXX-X.');
      return;
    }
    setCnicLoading(true);
    try {
      await api.post('/user/verify-cnic', { cnic });
      updateSessionCnic(cnic);
      setCnicVerified(true);
    } catch (err: unknown) {
      setCnicError(extractMsg(err, 'CNIC verification failed'));
    } finally {
      setCnicLoading(false);
    }
  };

  const enrollCredential = async (label: Label) => {
    if (!cnicVerified) return;
    setLoading(prev => ({ ...prev, [label]: true }));
    setError('');

    try {
      // 1. Get registration options
      const optionsRes = await api.post('/auth/webauthn/register/options', { label });

      // 2. Start WebAuthn registration - the OS opens its biometric popup
      const attestationResponse = await startRegistration({ optionsJSON: optionsRes.data.options });

      // 3. Verify and save credential
      await api.post('/auth/webauthn/register/verify', { label, credential: attestationResponse });

      // 4. Update status
      setStatus(prev => ({ ...prev, [label]: true }));
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError') {
        setError(`${label}: User cancelled or timeout`);
      } else {
        setError(`${label}: ${extractMsg(err, 'Registration failed')}`);
      }
    } finally {
      setLoading(prev => ({ ...prev, [label]: false }));
    }
  };

  const startFaceCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    faceStreamRef.current = stream;
    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = stream;
      await faceVideoRef.current.play();
    }
  };

  const enrollFaceWebcam = async () => {
    if (!cnicVerified) return;
    setLoading((prev) => ({ ...prev, 'FACE RECOGNITION': true }));
    setError('');

    const mobile = isMobileDevice();

    try {
      await startFaceCamera();

      const optionsRes = await api.post('/biometric/face/register-options', { mobile });

      if (optionsRes.data.mode === 'camera' || mobile) {
        const { dHash } = await captureFaceFromVideo(faceVideoRef.current!);
        await api.post('/biometric/face/register-verify', { face_d_hash: dHash, mobile: true });
      } else {
        const attestationResponse = await startRegistration({
          optionsJSON: optionsRes.data.options,
        });
        await api.post('/biometric/face/register-verify', { credential: attestationResponse });
      }

      stopFaceCamera();
      setStatus((prev) => ({ ...prev, 'FACE RECOGNITION': true }));
    } catch (err: unknown) {
      stopFaceCamera();
      const status = (err as { response?: { status?: number } })?.response?.status;
      const name = (err as { name?: string })?.name;
      if (status === 404) {
        setError('FACE RECOGNITION: API not found. Restart the backend (npm run dev) and try again.');
      } else if (name === 'NotAllowedError') {
        setError('FACE RECOGNITION: Allow front camera access and try again.');
      } else {
        setError(`FACE RECOGNITION: ${extractMsg(err, 'Registration failed')}`);
      }
    } finally {
      setLoading((prev) => ({ ...prev, 'FACE RECOGNITION': false }));
    }
  };

  const allEnrolled = cnicVerified && status.FINGERPRINT && status['FACE RECOGNITION'];

  const StatusBadge = ({ done }: { done: boolean }) =>
    done ? (
      <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
        <CheckCircle className="w-4 h-4" /> Verified ✓
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-0.5">
        Pending
      </span>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Secure Your Vote
        </h1>
        <p className="text-gray-600 mb-8">
          Verify your CNIC, then register both biometric methods. All three are required before you can vote.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Card 1: CNIC VERIFICATION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-100 p-3 rounded-lg shrink-0">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">CNIC VERIFICATION</h3>
                <StatusBadge done={cnicVerified} />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Enter your CNIC number first to verify identity.
              </p>

              {cnicVerified ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">CNIC verified</span>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cnic}
                    maxLength={15}
                    onChange={(e) => setCnic(formatCnicInput(e.target.value))}
                    placeholder="xxxxx-xxxxxxx-x"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {cnicError && <p className="text-sm text-red-600 mb-3">{cnicError}</p>}
                  <button
                    onClick={verifyCnic}
                    disabled={cnicLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    {cnicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Verify CNIC
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: FINGERPRINT */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4 ${!cnicVerified ? 'opacity-60' : ''}`}>
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg shrink-0">
              <Fingerprint className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">FINGERPRINT</h3>
                <StatusBadge done={status.FINGERPRINT} />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Register your fingerprint. On mobile, place finger on sensor when prompted.
              </p>

              {!cnicVerified ? (
                <p className="text-sm text-gray-500 italic">Complete CNIC verification first</p>
              ) : status.FINGERPRINT ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Registered ✓</span>
                </div>
              ) : (
                <button
                  onClick={() => enrollCredential('FINGERPRINT')}
                  disabled={loading.FINGERPRINT}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  {loading.FINGERPRINT ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Register FINGERPRINT
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: FACE RECOGNITION */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 ${!cnicVerified ? 'opacity-60' : ''}`}>
          <div className="flex items-start gap-4">
            <div className="bg-purple-100 p-3 rounded-lg shrink-0">
              <Camera className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">FACE RECOGNITION</h3>
                <StatusBadge done={status['FACE RECOGNITION']} />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {isMobileDevice()
                  ? 'On mobile: register using your front camera (not fingerprint).'
                  : 'On desktop: register using your webcam / security key. Requires HTTPS.'}
              </p>

              {!cnicVerified ? (
                <p className="text-sm text-gray-500 italic">Complete CNIC verification first</p>
              ) : status['FACE RECOGNITION'] ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Registered ✓</span>
                </div>
              ) : (
                <>
                  <div className="mb-4 overflow-hidden rounded-xl border-2 border-purple-200 bg-gray-900 aspect-video max-w-sm">
                    <video
                      id="face-camera"
                      ref={faceVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`h-full w-full object-cover ${loading['FACE RECOGNITION'] ? 'block' : 'hidden'}`}
                    />
                    {!loading['FACE RECOGNITION'] && (
                      <div className="flex h-full min-h-[140px] items-center justify-center bg-purple-50">
                        <Camera className="h-10 w-10 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={enrollFaceWebcam}
                    disabled={loading['FACE RECOGNITION']}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    {loading['FACE RECOGNITION'] ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isMobileDevice() ? 'Register FACE' : 'Register FACE (Webcam)'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Continue Button */}
        {allEnrolled && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800 font-medium mb-3">✓ Identity and biometrics verified successfully</p>
            <button
              onClick={() => navigate('/elections')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold w-full"
            >
              Go to Voting Page
            </button>
          </div>
        )}

        {/* Progress text */}
        <p className="text-sm text-gray-500 text-center">
          Step 1: CNIC {cnicVerified ? '✓' : '…'} → Step 2: Fingerprint {status.FINGERPRINT ? '✓' : '…'} → Step 3: Face {status['FACE RECOGNITION'] ? '✓' : '…'} → Ready to Vote
        </p>
      </div>
    </div>
  );
}
