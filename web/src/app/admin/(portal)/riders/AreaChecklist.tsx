"use client";

import type { Id } from "@/convex/api";
import type { ServiceArea } from "@/convex/returns/adminOps";

/** Tick the service areas a rider covers, grouped by state. */
export function AreaChecklist({ areas, value, onChange }: { areas: ServiceArea[]; value: Id<"serviceAreas">[]; onChange: (ids: Id<"serviceAreas">[]) => void }) {
  const states = [...new Set(areas.map((a) => a.state))].sort();
  const toggle = (id: Id<"serviceAreas">) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="lbl">Areas they cover</legend>
      {areas.length === 0 ? <p className="sm m-0">Add service areas first.</p> : null}
      {states.map((state) => (
        <div key={state} className="mb-2">
          <p className="cap m-0 font-semibold uppercase">{state}</p>
          <div className="grid grid-cols-2 m:grid-cols-1">
            {areas
              .filter((a) => a.state === state)
              .map((a) => (
                <label key={a._id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                  <input type="checkbox" className="size-5 accent-forest" checked={value.includes(a._id)} onChange={() => toggle(a._id)} />
                  {a.name}
                  {!a.active ? <span className="badge b-grey">Off</span> : null}
                </label>
              ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
