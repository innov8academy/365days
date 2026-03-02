"use client";

import { useMemo, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DEEP_WORK_DAILY_TARGET } from "@/lib/constants";
import { format } from "date-fns";

const CELL_SIZE_DESKTOP = 14;
const CELL_SIZE_MOBILE = 11;
const CELL_GAP = 2;

interface Summary {
  date: string;
  deep_work_minutes: number;
  streak_maintained: boolean;
  tasks_completed?: number;
  tasks_total?: number;
}

interface ContributionGraphProps {
  mySummaries: Summary[];
  partnerSummaries: Summary[];
  myName: string;
  partnerName: string;
}

type IntensityLevel = 0 | 1 | 2 | 3 | 4;

interface CellData {
  date: Date;
  dateStr: string;
  level: IntensityLevel;
  myMinutes: number;
  partnerMinutes: number;
  myHit: boolean;
  partnerHit: boolean;
  tasksCompleted?: number;
  tasksTotal?: number;
  hasSummary: boolean;
}

const INTENSITY_CLASSES: Record<IntensityLevel, string> = {
  0: "bg-muted",
  1: "bg-emerald-500/20",
  2: "bg-emerald-500/40",
  3: "bg-emerald-500/70",
  4: "bg-emerald-500",
};

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function getIntensity(cell: {
  myMinutes: number;
  partnerMinutes: number;
  myHit: boolean;
  partnerHit: boolean;
  hasSummary: boolean;
  tasksCompleted?: number;
  tasksTotal?: number;
}): IntensityLevel {
  if (!cell.hasSummary) return 0;

  const bothHit = cell.myHit && cell.partnerHit;
  const oneHit = cell.myHit || cell.partnerHit;
  const allTasksDone =
    cell.tasksTotal !== undefined &&
    cell.tasksTotal > 0 &&
    cell.tasksCompleted === cell.tasksTotal;

  if (bothHit && allTasksDone) return 4;
  if (bothHit) return 3;
  if (oneHit) return 2;

  // Some work done but nobody hit target
  if (cell.myMinutes > 0 || cell.partnerMinutes > 0) return 1;

  return 0;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function ContributionGraph({
  mySummaries,
  partnerSummaries,
  myName,
  partnerName,
}: ContributionGraphProps) {
  const { cells, monthLabels } = useMemo(() => {
    const target = DEEP_WORK_DAILY_TARGET;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build lookup maps
    const myMap = new Map<string, Summary>();
    for (const s of mySummaries) myMap.set(s.date, s);
    const partnerMap = new Map<string, Summary>();
    for (const s of partnerSummaries) partnerMap.set(s.date, s);

    // We need to build a grid: 7 rows × N columns
    // Right-aligned so today is in the rightmost column
    // Go back enough days to fill 13 full weeks (91 days max for desktop)
    const todayDow = (today.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const totalDays = 12 * 7 + todayDow + 1; // 12 full weeks + partial current week

    const allCells: CellData[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = format(date, "yyyy-MM-dd");

      const mySummary = myMap.get(dateStr);
      const partnerSummary = partnerMap.get(dateStr);
      const myMinutes = mySummary?.deep_work_minutes ?? 0;
      const partnerMinutes = partnerSummary?.deep_work_minutes ?? 0;
      const myHit = myMinutes >= target;
      const partnerHit = partnerMinutes >= target;
      const hasSummary = !!(mySummary || partnerSummary);

      const cellData: CellData = {
        date,
        dateStr,
        myMinutes,
        partnerMinutes,
        myHit,
        partnerHit,
        hasSummary,
        level: 0,
      };
      cellData.level = getIntensity(cellData);
      allCells.push(cellData);
    }

    // Organize into columns (weeks). Each column = 7 days (Mon-Sun)
    const columns: (CellData | null)[][] = [];
    let colIdx = 0;
    let col: (CellData | null)[] = [];

    for (let i = 0; i < allCells.length; i++) {
      const dow = (allCells[i].date.getDay() + 6) % 7; // 0=Mon, 6=Sun

      // Start a new column if this is Monday and we have cells
      if (dow === 0 && col.length > 0) {
        columns.push(col);
        col = [];
        colIdx++;
      }

      // Pad the first column if it doesn't start on Monday
      if (colIdx === 0 && col.length === 0 && dow > 0) {
        for (let pad = 0; pad < dow; pad++) {
          col.push(null);
        }
      }

      col.push(allCells[i]);
    }

    // Pad the last column to 7 if needed
    while (col.length < 7) col.push(null);
    columns.push(col);

    // Generate month labels
    const labels: { text: string; colIndex: number }[] = [];
    let lastMonth = -1;
    for (let c = 0; c < columns.length; c++) {
      const firstCell = columns[c].find((cell) => cell !== null);
      if (firstCell) {
        const month = firstCell.date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            text: format(firstCell.date, "MMM"),
            colIndex: c,
          });
          lastMonth = month;
        }
      }
    }

    return { cells: columns, monthLabels: labels };
  }, [mySummaries, partnerSummaries]);

  const [cellSize, setCellSize] = useState(CELL_SIZE_DESKTOP);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setCellSize(mq.matches ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const colWidth = cellSize + CELL_GAP;

  return (
    <div className="space-y-2">
      <TooltipProvider delayDuration={100}>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex ml-8 mb-1">
            {cells.map((_, colIdx) => {
              const label = monthLabels.find((l) => l.colIndex === colIdx);
              return (
                <div
                  key={colIdx}
                  className="text-[10px] text-muted-foreground"
                  style={{ width: colWidth, flexShrink: 0 }}
                >
                  {label?.text ?? ""}
                </div>
              );
            })}
          </div>

          {/* Grid: day labels + cells */}
          <div className="flex gap-0">
            {/* Day labels */}
            <div
              className="flex flex-col mr-1 shrink-0"
              style={{ gap: CELL_GAP }}
            >
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="text-[10px] text-muted-foreground flex items-center justify-end pr-1"
                  style={{ height: cellSize }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Columns */}
            <div className="flex" style={{ gap: CELL_GAP }}>
              {cells.map((column, colIdx) => (
                <div
                  key={colIdx}
                  className="flex flex-col"
                  style={{ gap: CELL_GAP }}
                >
                  {column.map((cell, rowIdx) =>
                    cell ? (
                      <Tooltip key={cell.dateStr}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "rounded-sm transition-colors duration-150",
                              INTENSITY_CLASSES[cell.level],
                              "hover:ring-1 hover:ring-foreground/20"
                            )}
                            style={{ width: cellSize, height: cellSize }}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="bg-popover text-popover-foreground border shadow-md px-3 py-2 text-xs space-y-1 max-w-[200px]"
                        >
                          <div className="font-medium">
                            {format(cell.date, "EEE, MMM d")}
                          </div>
                          <div className="text-muted-foreground">
                            {myName}: {formatMinutes(cell.myMinutes)} /{" "}
                            {formatMinutes(DEEP_WORK_DAILY_TARGET)}
                            {cell.myHit ? " ✓" : ""}
                          </div>
                          <div className="text-muted-foreground">
                            {partnerName}: {formatMinutes(cell.partnerMinutes)} /{" "}
                            {formatMinutes(DEEP_WORK_DAILY_TARGET)}
                            {cell.partnerHit ? " ✓" : ""}
                          </div>
                          <div className="text-muted-foreground pt-0.5 border-t border-border">
                            {cell.myHit && cell.partnerHit
                              ? "Both completed"
                              : cell.myHit
                                ? `${myName} completed`
                                : cell.partnerHit
                                  ? `${partnerName} completed`
                                  : cell.hasSummary
                                    ? "Neither completed"
                                    : "No data"}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div
                        key={`empty-${rowIdx}`}
                        style={{ width: cellSize, height: cellSize }}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground justify-end pt-1">
          <span>Less</span>
          {(
            [
              [0, "No activity"],
              [1, "Some work"],
              [2, "Target met"],
              [3, "Both met"],
              [4, "Perfect day"],
            ] as [IntensityLevel, string][]
          ).map(([level, label]) => (
            <Tooltip key={level}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-[10px] h-[10px] rounded-sm",
                    INTENSITY_CLASSES[level]
                  )}
                  title={label}
                />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-popover text-popover-foreground border text-xs"
              >
                {label}
              </TooltipContent>
            </Tooltip>
          ))}
          <span>More</span>
        </div>
      </TooltipProvider>
    </div>
  );
}
