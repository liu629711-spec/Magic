// 定时任务页（2026-09-19，图二 TRAE「自动化」重设计）：已配置 / 执行历史 /
// 任务模板三个分页 + 卡片网格。Magic 当前无调度器插件（已核查 patches/web.patch.yml
// 挂载清单）——「已配置/执行历史」诚实空态；「任务模板」点卡片 / 「在对话中创建」
// = 新建任务并把模板诉求注入输入框草稿，由 runtime 实际承接创建。
import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../sidebar/Icon";

/** 任务模板（图二 八款，Magic 语境）。 */
const TEMPLATES: { name: string; desc: string; icon: string }[] = [
  { name: "每日 AI 行业简报", desc: "每天早上汇总 AI 行业热点新闻摘要与趋势分析", icon: "auto_awesome" },
  { name: "品牌舆情监控简报", desc: "每周自动抓取品牌在社交媒体和社区中的提及与评价，生成舆情摘要", icon: "travel_explore" },
  { name: "每周竞品动态追踪", desc: "定期追踪竞品的产品更新、社区反馈和重要新闻", icon: "track_changes" },
  { name: "股价监控与预警", desc: "每天追踪关注的股票价格变动，异常波动时自动预警", icon: "monitoring" },
  { name: "安全漏洞扫描", desc: "定期扫描代码仓库，发现经过验证的中高危安全漏洞", icon: "security" },
  { name: "扫描提交发现 Bug", desc: "分析最近的代码提交，发现可能导致严重后果的高危 Bug", icon: "bug_report" },
  { name: "补充测试覆盖", desc: "识别最近变更中缺少测试的高风险代码，自动补充测试", icon: "verified" },
  { name: "每日变更摘要", desc: "每天汇总代码仓库的变更情况，生成团队可靠的工程日报", icon: "summarize" },
];

type Tab = "configured" | "history" | "templates";

export function AutomationPage({ onCreateInConversation }: {
  /** 在对话中创建：新建任务并把诉求注入输入框草稿（App 桥）。 */
  onCreateInConversation: (draft: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("templates");

  const createFromTemplate = (name: string, desc: string) =>
    onCreateInConversation(`请帮我创建一个定时任务：「${name}」——${desc}。执行计划先按每天一次安排，创建前和我确认具体时间与执行方式。`);
  const createManual = () =>
    onCreateInConversation("请帮我创建一个定时任务。我先描述需求：……（补充你要自动化的内容、频率与通知方式），确认后帮我落地。");

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[1080px] px-7 pt-[52px] pb-6">
        {/* pt-[52px]：右上角窗口控制行（WindowControls）占住第一行，头部内容避让 */}
        {/* 头部：标题 + 副标题 + 右侧动作（图二） */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">定时任务</h1>
            <p className="mt-1 text-[12.5px] text-outline">
              配置和管理自动化任务，让 Magic 按计划执行工作流。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={createManual}
              className="flex h-8 items-center rounded-lg border border-line px-3 text-[12.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface cursor-pointer"
            >
              手动新建
            </button>
            <button
              type="button"
              onClick={createManual}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-medium text-on-primary transition-colors hover:brightness-110 cursor-pointer"
            >
              <Icon name="add_circle" className="text-[15px]" />
              在对话中创建
            </button>
          </div>
        </div>

        {/* 分页 tab（图二：已配置 / 执行历史 / 任务模板，底边高亮） */}
        <div className="mt-4 flex items-stretch gap-6 border-b border-surface-container-highest">
          {([
            { id: "configured" as const, label: "已配置" },
            { id: "history" as const, label: "执行历史" },
            { id: "templates" as const, label: "任务模板" },
          ]).map(item => (
            <button
              key={item.id}
              type="button"
              data-automation-tab={item.id}
              onClick={() => setTab(item.id)}
              className={`-mb-px cursor-pointer border-b-2 pb-2 text-[13px] font-medium transition-colors ${
                tab === item.id
                  ? "border-b-primary text-on-surface"
                  : "border-b-transparent text-outline hover:text-on-surface"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "configured" ? (
          <EmptyBlock
            icon="schedule"
            title="尚无已配置的定时任务"
            detail="从任务模板一键创建，或在对话中直接描述你的自动化需求。"
          />
        ) : tab === "history" ? (
          <EmptyBlock
            icon="history"
            title="暂无执行历史"
            detail="定时任务创建并到点执行后，这里会记录每次运行的状态与产出。"
          />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {TEMPLATES.map(item => (
              <button
                key={item.name}
                type="button"
                data-automation-template={item.name}
                onClick={() => createFromTemplate(item.name, item.desc)}
                className="group flex min-h-[118px] cursor-pointer flex-col items-start rounded-xl border border-surface-container-high/60 bg-surface-container-lowest p-4 text-left transition-colors hover:border-line hover:bg-surface-container-low"
              >
                <TemplateGlyph icon={item.icon} />
                <span className="mt-3 text-[13.5px] font-medium text-on-surface">{item.name}</span>
                <span className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-outline">
                  {item.desc}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 模板卡图标块（图二：迷你窗口三圆点 + 功能图标）。 */
function TemplateGlyph({ icon }: { icon: string }) {
  return (
    <span className="flex h-11 w-11 flex-col overflow-hidden rounded-lg border border-line bg-surface-container-low shadow-hairline">
      <span className="flex h-3.5 shrink-0 items-center gap-[3px] border-b border-line/70 bg-surface-container px-1.5">
        <span className="size-[4px] rounded-full bg-[#e5645c]" />
        <span className="size-[4px] rounded-full bg-[#e5b95c]" />
        <span className="size-[4px] rounded-full bg-[#5cc46a]" />
      </span>
      <span className="flex flex-1 items-center justify-center">
        <Icon name={icon} className="text-[16px] text-on-surface-variant" />
      </span>
    </span>
  );
}

function EmptyBlock({ icon, title, detail }: { icon: string; title: string; detail: string }): ReactNode {
  return (
    <div className="mt-16 flex flex-col items-center gap-2 text-center">
      <Icon name={icon} className="text-[30px] text-outline" />
      <div className="text-[14px] font-medium text-on-surface-variant">{title}</div>
      <div className="max-w-[420px] text-[12.5px] text-outline">{detail}</div>
    </div>
  );
}
