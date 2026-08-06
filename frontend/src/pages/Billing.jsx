import { useBilling } from "@/hooks/useBilling";
import BillingHeader from "../components/billing/BillingHeader";
import CurrentUsageSection from "../components/billing/CurrentUsageSection";
import PlansSection from "../components/billing/PlansSection";
import PaymentMethodSection from "../components/billing/PaymentMethodSection";
import InvoiceHistorySection from "../components/billing/InvoiceHistorySection";

export default function Billing() {
  const {
    billing,
    setBilling,
    upgrading,
    handleUpgrade,
    usage,
    plans,
    invoices,
  } = useBilling();

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-5xl mx-auto space-y-6">
      <BillingHeader />
      <CurrentUsageSection usage={usage} />
      <PlansSection
        billing={billing}
        setBilling={setBilling}
        plans={plans}
        upgrading={upgrading}
        handleUpgrade={handleUpgrade}
      />
      <PaymentMethodSection />
      <InvoiceHistorySection invoices={invoices} />
    </div>
  );
}
