// 计划审批卡（PRD-02 §15.4）：exit_plan_mode 提交计划后，user-questions waterfall
// 的 plan-review 提问在这里落地——计划全文 + 批准 / 继续计划（可带反馈）。
// 位置 = 输入区上方（CeoDecisionDock 同座），批准即由 runtime 退出计划模式并开始执行。
import { useState, useSyncExternalStore } from "react";
import {
  answerPendingPlanReview,
  getPendingPlanReview,
  subscribePlanReview,
} from "./plan-review-store.ts";

export function PlanReviewCard() {
  const pending = useSyncExternalStore(subscribePlanReview, getPendingPlanReview, getPendingPlanReview);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  if (pending === null) return null;
  return (
    <div
      data-plan-review-card
      className="mb-2 rounded-[16px] border border-line bg-surface p-4 shadow-overlay"
      style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[17px] text-ink-2" aria-hidden>checklist</span>
        <span className="text-[14px] leading-5 font-semibold text-ink">{pending.header}</span>
      </div>
      <p className="mt-1 text-[12.5px] leading-[18px] text-ink-3">{pending.question}</p>
      <pre className="mt-2.5 max-h-[280px] overflow-y-auto whitespace-pre-wrap break-words rounded-[12px] border-[0.5px] border-line bg-surface-container-low p-3 font-sans text-[12.5px] leading-[20px] text-ink-2">
        {pending.detail}
      </pre>
      {showFeedback ? (
        <textarea
          value={feedback}
          onChange={event => setFeedback(event.target.value)}
          rows={2}
          placeholder="给智能体的修改反馈（可留空，仅继续计划）"
          aria-label="计划修改反馈"
          className="mt-2.5 w-full resize-none rounded-[10px] border-[0.5px] border-line bg-field px-2.5 py-2 text-[12.5px] leading-[19px] text-ink outline-none placeholder:text-ink-3 focus:border-line-strong"
        />
      ) : null}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            if (showFeedback) {
              answerPendingPlanReview([pending.keepLabel], feedback);
            } else {
              setShowFeedback(true);
            }
          }}
          className="flex h-8 items-center rounded-[10px] border border-line px-3 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-hover"
        >
          {showFeedback ? "继续计划" : "继续计划…"}
        </button>
        <button
          type="button"
          onClick={() => answerPendingPlanReview([pending.approveLabel])}
          className="flex h-8 items-center rounded-[10px] bg-primary px-3.5 text-[12.5px] font-medium text-on-primary transition-opacity duration-150 hover:opacity-90"
        >
          {pending.approveLabel}
        </button>
      </div>
    </div>
  );
}
