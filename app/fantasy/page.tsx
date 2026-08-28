import type { Metadata } from "next";
import FantasySignupClient from "./FantasySignupClient";

export const metadata: Metadata = {
  title: "Gold Jacket Fantasy",
  description: "10-team PPR fantasy football on Sleeper. $10 buy-in.",
};

export default function FantasyPage() {
  return <FantasySignupClient />;
}
