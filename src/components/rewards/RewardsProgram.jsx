import "./RewardsProgram.styles.css";
import { memo } from "react";
import { ArrowRight, BadgeCheck, Clock3 } from "lucide-react";

const steps = [
  { label: "Create account", text: "Sign in before checkout." },
  { label: "Place order", text: "Eligible orders earn points." },
  { label: "Track rewards", text: "View everything in your portal." },
];

const RewardStep = memo(function RewardStep({ step, index }) {
  return (
    <article className="reward-step">
      <span className="reward-step-number">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div>
        <h3>{step.label}</h3>
        <p>{step.text}</p>
      </div>
    </article>
  );
});

export default function RewardsProgram() {
  return (
    <section className="rewards-section phase-band phase-band--cobalt relative overflow-hidden px-6 py-12 text-white sm:py-16 lg:py-20">
      <div className="rewards-bg" aria-hidden="true" />

      <div className="rewards-layout relative mx-auto max-w-6xl">
        <div className="rewards-copy">
          <div className="rewards-kicker">
            <span />
            Rewards Program
          </div>

          <h2>
            Earn more from the orders
            <span> you already place.</span>
          </h2>

          <p className="rewards-intro">
            Create an account before checkout to earn points, review recent
            orders, and manage rewards from one portal.
          </p>

          <div className="rewards-actions">
            <a href="/register" className="is-primary">
              Create account
              <ArrowRight size={15} aria-hidden="true" />
            </a>

            <a href="/account">View portal</a>
          </div>

          <div className="reward-note">
            <BadgeCheck size={17} aria-hidden="true" />
            <p>
              Account required before checkout. Guest orders cannot receive
              rewards retroactively.
            </p>
          </div>
        </div>

        <div className="rewards-flow">
          <header>
            <div>
              <p>How it works</p>
              <h3>Three simple steps</h3>
            </div>

            <span>
              <Clock3 size={13} aria-hidden="true" />
              Before checkout
            </span>
          </header>

          <div className="rewards-steps">
            {steps.map((step, index) => (
              <RewardStep key={step.label} step={step} index={index} />
            ))}
          </div>

          <p className="rewards-eligibility">
            Eligible completed or processing orders connected to a customer
            account only.
          </p>
        </div>
      </div>
    </section>
  );
}
