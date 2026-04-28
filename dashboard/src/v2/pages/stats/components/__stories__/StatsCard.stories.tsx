import type { Meta, StoryObj } from "@storybook/preact";
import { h } from "preact";
import { StatsCard } from "../StatsCard.js";
import { Activity, Brain, Clock, Zap } from "lucide-preact";

const meta: Meta<typeof StatsCard> = {
  title: "Stats/StatsCard",
  component: StatsCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    accent: {
      control: "select",
      options: ["default", "signal", "amber", "cyan", "rose", "emerald"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatsCard>;

export const Default: Story = {
  args: {
    title: "Total Throughput",
    value: "1,240,582",
    description: "tokens processed today",
    icon: Zap,
    accent: "signal",
  },
};

export const WithTrend: Story = {
  args: {
    title: "Active Latency",
    value: "342ms",
    trend: (
      <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
        -12%
      </div>
    ),
    description: "avg response time",
    icon: Clock,
    accent: "cyan",
  },
};

export const Critical: Story = {
  args: {
    title: "Failed Invocations",
    value: "12",
    description: "retries exhausted",
    icon: Activity,
    accent: "rose",
  },
};

export const Intelligence: Story = {
  args: {
    title: "Reasoning Balance",
    value: "42%",
    description: "of output tokens",
    icon: Brain,
    accent: "amber",
  },
};

export const Minimal: Story = {
  args: {
    title: "Simple Stat",
    value: "99.9%",
  },
};

export const Active: Story = {
  args: {
    title: "Live Monitor",
    value: "Processing...",
    isActive: true,
    accent: "signal",
  },
};
