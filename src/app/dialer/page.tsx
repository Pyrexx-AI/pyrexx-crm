"use client";
import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Avatar } from "@/components/ui/Avatar";
import { Sparkles, PhoneOutgoing } from "lucide-react";

export default function DialerPage() {
  const [digits, setDigits] = useState("");
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

  const press = (d: string) => setDigits((s) => (s + d).slice(0, 14));
  const backspace = () => setDigits((s) => s.slice(0, -1));

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-md mx-auto">
        <SectionTitle title="Dialer" />

        <div className="rounded-xl p-4 mb-4 flex items-start gap-2 bg-amberSoft border border-amber">
          <Sparkles size={15} className="text-amber flex-shrink-0 mt-0.5" />
          <span className="text-xs text-ink600 font-body">
            Outbound calling activates once Retell's full calling package is connected. This is a frontend preview only.
          </span>
        </div>

        <div className="rounded-xl p-6 text-center mb-6 bg-white border border-line shadow-card">
          <input
            value={digits}
            onChange={(e) => setDigits(e.target.value)}
            placeholder="Enter a number"
            className="w-full text-center text-2xl mb-5 outline-none bg-transparent font-mono text-ink"
            readOnly
          />
          <div className="grid grid-cols-3 gap-3 mb-5">
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => press(k)}
                className="aspect-square rounded-full text-lg font-medium bg-paperDim text-ink font-mono hover:bg-[#E0DFDA] transition-colors"
              >
                {k}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-5">
            <button onClick={backspace} className="text-sm text-slate font-body hover:text-ink">
              ⌫ Delete
            </button>
            <button disabled className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-sage text-white opacity-50 cursor-not-allowed">
              <PhoneOutgoing size={16} /> Call
            </button>
          </div>
        </div>

        <div className="text-xs uppercase mb-2 text-slate tracking-[0.06em] font-body">Recent outbound</div>
        <div className="rounded-xl overflow-hidden border border-line bg-white shadow-card">
          {[
            { id: 1, name: "Sarah Okafor", phone: "(415) 555-0132" },
            { id: 2, name: "David Chen", phone: "(628) 555-0198" }
          ].map((ct) => (
            <div key={ct.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
              <Avatar name={ct.name} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate text-ink font-body">{ct.name}</div>
                <div className="text-xs text-slate font-mono">{ct.phone}</div>
              </div>
              <button disabled className="p-2 rounded-full bg-paperDim opacity-50 cursor-not-allowed">
                <PhoneOutgoing size={13} className="text-slate" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}