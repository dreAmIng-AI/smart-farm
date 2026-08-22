import {
  getWorkCycleGuidance,
  type WorkCycleGuidanceInput,
} from "@/lib/core/work-cycle-guidance";

export function WorkCycleGuidance(props: WorkCycleGuidanceInput) {
  const guidance = getWorkCycleGuidance(props);

  return (
    <section
      className={`card work-cycle-guidance work-cycle-guidance-${guidance.tone} stack`}
      aria-labelledby="work-cycle-guidance-heading"
    >
      <p className="eyebrow">지금 할 일</p>
      <h2 id="work-cycle-guidance-heading">{guidance.title}</h2>
      <p className="muted">{guidance.description}</p>
      <a className="work-cycle-guidance-action" href={`#${guidance.targetId}`}>
        {guidance.actionLabel}
      </a>
    </section>
  );
}
