import { getFarmSetupProgress } from "@/lib/core/farm-setup-progress";

type FarmSetupProgressProps = {
  canManageFarm: boolean;
  hasFarm: boolean;
  hasScheduledTasks: boolean;
  hasSelectedCropCycle: boolean;
};

const stepStatusLabel = {
  complete: "완료",
  current: "지금",
  next: "다음",
} as const;

export function FarmSetupProgress(props: FarmSetupProgressProps) {
  const steps = getFarmSetupProgress(props);
  const currentStep = steps.find((step) => step.status === "current");

  return (
    <section className="farm-setup-progress" aria-labelledby="farm-setup-progress-heading">
      <div className="farm-setup-progress-heading">
        <div>
          <p className="eyebrow">농장 준비</p>
          <h1 id="farm-setup-progress-heading">
            {currentStep ? `${currentStep.label}부터 준비해 주세요` : "오늘 농장 관리가 준비되었습니다"}
          </h1>
        </div>
        <span>{steps.filter((step) => step.status === "complete").length} / {steps.length}</span>
      </div>
      <ol className="farm-setup-progress-list">
        {steps.map((step, index) => (
          <li className={`farm-setup-progress-${step.status}`} key={step.id}>
            <a href={`#${step.id}`}>
              <span className="farm-setup-progress-number" aria-hidden="true">{index + 1}</span>
              <span>
                <strong>{step.label}</strong>
                <small>{step.description}</small>
              </span>
              <em>{stepStatusLabel[step.status]}</em>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
