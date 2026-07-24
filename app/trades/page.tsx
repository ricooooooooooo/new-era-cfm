import UnderConstruction from "@/app/components/UnderConstruction";

export default function TradesPage() {
  return (
    <UnderConstruction
      title="Trade Center"
      description="The NEW ERA Trade Center is currently under construction. Owners will eventually be able to submit trades, review pending deals, browse the trade block, and track league transaction history."
      features={[
        "Submit Trades",
        "Pending Approvals",
        "Trade History",
        "Trade Block",
        "Salary Impact",
        "Commissioner Review",
      ]}
      releaseText="Launching after teams are officially claimed"
    />
  );
}