import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { razorpayApi } from '../../services/api';
import { loadRazorpayCheckout } from '../../utils/razorpay';

export default function RazorpayCheckoutButton({
  amount = 50000, // in paise (e.g., 50000 = ₹500.00)
  currency = 'INR',
  receipt,
  name = 'CampusOryx School',
  description = 'Standard Fee / Service Payment',
  prefill = {},
  buttonText,
  className = '',
  onSuccess,
  onError,
}) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  const displayAmount = (amount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
  });

  const handlePayment = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Initializing secure Razorpay payment...');
    setPaymentResult(null);

    try {
      // Validate amount >= 100 paise
      if (!amount || amount < 100) {
        throw new Error('Payment amount must be at least 100 paise (₹1.00).');
      }

      // 1. Ensure Razorpay checkout script is loaded
      const Razorpay = window.Razorpay || (await loadRazorpayCheckout());
      if (!Razorpay) {
        throw new Error('Razorpay Checkout SDK failed to load. Please check your network connection.');
      }

      // 2. Call backend endpoint to create order: POST /api/create-order
      setStatusMessage('Creating payment order...');
      const orderResponse = await razorpayApi.createOrder({
        amount: Math.round(amount),
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
      });

      const orderData = orderResponse?.data || orderResponse;
      const orderId = orderData.order_id || orderData.id;

      if (!orderId) {
        throw new Error('Server failed to return a valid Razorpay order ID.');
      }

      const keyId =
        orderData.key_id ||
        import.meta.env.VITE_RAZORPAY_KEY_ID ||
        'rzp_test_TnpXuenJ5WWK2i';

      setStatusMessage('Opening secure checkout modal...');

      // 3. Open Razorpay modal with order_id
      let paymentCompleted = false;

      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name,
        description,
        order_id: orderId,
        prefill: {
          name: prefill.name || '',
          email: prefill.email || '',
          contact: prefill.contact || '',
        },
        theme: {
          color: '#6d3bd7',
        },
        handler: async (response) => {
          paymentCompleted = true;
          setStatusMessage('Payment received! Verifying cryptographic signature...');

          try {
            // STEP 3: Call backend endpoint to verify signature: POST /api/verify-payment
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };

            const verifyResponse = await razorpayApi.verifyPayment(verifyPayload);

            setStatusMessage(null);
            setPaymentResult({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              status: 'VERIFIED',
            });

            if (onSuccess) {
              onSuccess({
                ...verifyPayload,
                verifyResponse,
              });
            }
          } catch (verifyErr) {
            const errText =
              verifyErr.message ||
              'Payment signature verification failed. Please contact support.';
            setErrorMessage(errText);
            setStatusMessage(null);
            if (onError) onError(verifyErr);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            if (!paymentCompleted) {
              setLoading(false);
              setStatusMessage(null);
              setErrorMessage('Payment cancelled by user.');
              if (onError) onError(new Error('Payment cancelled by user.'));
            }
          },
        },
      };

      const rzpInstance = new Razorpay(options);

      rzpInstance.on('payment.failed', (failResponse) => {
        setLoading(false);
        setStatusMessage(null);
        const desc =
          failResponse.error?.description ||
          failResponse.error?.reason ||
          'Payment declined by payment gateway.';
        setErrorMessage(`Payment Failed: ${desc}`);
        if (onError) onError(failResponse.error);
      });

      rzpInstance.open();
    } catch (err) {
      setLoading(false);
      setStatusMessage(null);
      const message = err.message || 'Unable to initiate payment with Razorpay.';
      setErrorMessage(message);
      if (onError) onError(err);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        id="razorpay-standard-checkout-btn"
        onClick={handlePayment}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
          className || 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'
        }`}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 shrink-0" />
            {buttonText || `Pay ${displayAmount} with Razorpay`}
          </>
        )}
      </button>

      {statusMessage && (
        <p className="text-xs text-brand-600 dark:text-brand-400 font-medium animate-pulse flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
          {statusMessage}
        </p>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
          <span className="font-semibold text-red-500">Error:</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {paymentResult && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-200">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Payment Verified & Completed!
          </div>
          <div className="font-mono text-[11px] opacity-90">
            <div>Payment ID: {paymentResult.paymentId}</div>
            <div>Order ID: {paymentResult.orderId}</div>
          </div>
        </div>
      )}
    </div>
  );
}
