import UnderConstruction from "@/app/components/UnderConstruction";

export default function SchedulePage() {
  return (
    <UnderConstruction
      title="Schedule Center"
      description="The NEW ERA Schedule Center is currently under construction. Once the league begins, this page will become the main hub for weekly matchups, results, deadlines, and the playoff race."
      features={[
        "Weekly Matchups",
        "Game Results",
        "Primetime Games",
        "Game Deadlines",
        "Bye Weeks",
        "Playoff Picture",
      ]}
      releaseText="Launching before the NEW ERA season begins"
    />
  );
}