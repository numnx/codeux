import type { ComponentChildren, FunctionComponent, JSX, Ref } from "preact";

const PAGE_CONTAINER_WIDTH = "max-w-[2400px]";

const pageContainerPadding = {
  overview: "px-4 py-12 pb-36 md:px-20 md:py-24 md:pb-32",
  standard: "px-4 py-24 pb-36 md:px-20 md:pb-32",
  section: "px-4 py-16 pb-36 md:px-20 md:pb-32",
  stats: "px-4 py-20 pb-36 md:px-20 md:pb-32",
  settings: "px-4 py-16 pb-36 md:px-8 md:pb-32 xl:px-12",
  agents: "px-4 py-14 pb-36 md:px-16 md:pb-32 lg:px-20",
  browser: "px-4 py-6 pb-36 md:px-8 md:pb-32",
  workbench: "px-4 py-12 pb-36 md:px-20 md:pb-32",
  chat: "px-4 py-12 pb-36 md:px-20 md:pb-32",
  sprintsEmpty: "px-4 py-12 pb-36 md:px-20 md:pb-32",
  none: "",
} as const;

type PageContainerPadding = keyof typeof pageContainerPadding;

type PageContainerProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "ref"> & {
  children: ComponentChildren;
  className?: string;
  containerRef?: Ref<HTMLDivElement>;
  padding?: PageContainerPadding;
};

export const PageContainer: FunctionComponent<PageContainerProps> = ({
  children,
  className = "",
  containerRef,
  padding = "standard",
  ...props
}) => {
  const classes = [
    "relative z-10 mx-auto flex w-full flex-col animate-in fade-in duration-200",
    PAGE_CONTAINER_WIDTH,
    pageContainerPadding[padding],
    className,
  ].filter(Boolean).join(" ");

  return (
    <div {...props} ref={containerRef} className={classes}>
      {children}
    </div>
  );
};

