"use client";
import { format, startOfMonth, startOfYear, subMonths, parseISO } from "date-fns";
import { today } from "@/lib/domain";

export type Period = { start: string; end: string; preset: string };

export function initialPeriod(): Period {
  return { start: today().slice(0, 7) + "-01", end: today(), preset: "month" };
}

export function PeriodFilter({
  value,
  onChange,
}: {
  value: Period;
  onChange: (v: Period) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="period">
        Período
      </label>
      <select
        id="period"
        className="input m-0 h-10 w-auto min-w-[152px] py-2 font-medium"
        value={value.preset}
        onChange={(e) => {
          const preset = e.target.value;
          const now = parseISO(today());
          const start =
            preset === "year"
              ? startOfYear(now)
              : preset === "3"
                ? startOfMonth(subMonths(now, 2))
                : preset === "6"
                  ? startOfMonth(subMonths(now, 5))
                  : startOfMonth(now);
          onChange({
            start: format(start, "yyyy-MM-dd"),
            end: today(),
            preset,
          });
        }}
      >
        <option value="month">Este mês</option>
        <option value="3">Últimos 3 meses</option>
        <option value="6">Últimos 6 meses</option>
        <option value="year">Este ano</option>
        <option value="custom">Personalizado</option>
      </select>
      {value.preset === "custom" && (
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <input
            aria-label="Data inicial"
            className="input m-0 h-10 w-full py-2 sm:w-auto"
            type="date"
            max={value.end}
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
          />
          <input
            aria-label="Data final"
            className="input m-0 h-10 w-full py-2 sm:w-auto"
            type="date"
            min={value.start}
            max={today()}
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
