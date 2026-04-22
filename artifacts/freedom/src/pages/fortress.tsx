import { useMemo } from "react";
import { motion } from "framer-motion";
import { useFreedom } from "@/lib/context";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const FORTRESS_SECTIONS = [
  {
    title: "DNS Layer",
    items: [
      { id: "dns-nextdns", title: "Set up NextDNS profile", desc: "Blocks adult and addictive content at the network level, even in incognito.", hint: "nextdns.io" },
    ]
  },
  {
    title: "iOS Restrictions",
    items: [
      { id: "ios-content", title: "Enable Screen Time content restrictions", desc: "Blocks explicit websites on all browsers.", hint: "Settings > Screen Time > Content & Privacy" },
      { id: "ios-passcode", title: "Set Screen Time passcode (friend holds it)", desc: "If you hold the code, you'll cave at 2am.", hint: "Give the code to a trusted friend" },
      { id: "ios-appstore", title: "Turn off App Store installation", desc: "Prevents redownloading addictive apps in a moment of weakness.", hint: "Screen Time > iTunes & App Store Purchases" },
    ]
  },
  {
    title: "App Removal",
    items: [
      { id: "app-social", title: "Delete Reddit, X, TikTok, Instagram", desc: "If it's not on your phone, you can't open it." },
      { id: "app-browser", title: "Disable Safari, use filtered browser", desc: "Safari cannot be fully locked down without Screen Time.", hint: "Use apps like Pluck or SPIN" },
    ]
  },
  {
    title: "Accountability",
    items: [
      { id: "acc-tell", title: "Tell one trusted person", desc: "Secrecy feeds the addiction. Bring it into the light." },
    ]
  }
];

export default function Fortress() {
  const { fortressItems, toggleFortressItem } = useFreedom();

  const totalItems = useMemo(() => FORTRESS_SECTIONS.reduce((acc, sec) => acc + sec.items.length, 0), []);
  const completedItems = fortressItems.length;
  const isFullyProtected = completedItems === totalItems;
  const progressPercent = (completedItems / totalItems) * 100;

  return (
    <div className="py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-serif text-foreground">The Fortress</h1>
        <p className="text-muted-foreground text-sm">Build a defensive perimeter around your device. Willpower alone is not enough.</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono tracking-widest uppercase">
          <span className="text-foreground">Defenses</span>
          <span className={isFullyProtected ? "text-primary font-bold" : "text-muted-foreground"}>
            {completedItems} / {totalItems}
          </span>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {isFullyProtected && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-primary/30 p-6 rounded-xl text-center space-y-3 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-primary/5" />
          <div className="relative z-10">
            <h2 className="text-lg font-serif text-primary uppercase tracking-[0.2em]">Fully Protected</h2>
            <p className="text-xs text-muted-foreground font-mono">Your environment is secure.</p>
          </div>
        </motion.div>
      )}

      <div className="space-y-10">
        {FORTRESS_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              {section.title}
            </h3>
            <div className="space-y-4">
              {section.items.map((item) => {
                const isChecked = fortressItems.includes(item.id);
                return (
                  <div key={item.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={item.id}
                      checked={isChecked}
                      onCheckedChange={() => toggleFortressItem(item.id)}
                      className="mt-1 data-[state=checked]:bg-success data-[state=checked]:text-success-foreground data-[state=checked]:border-success border-muted-foreground/50"
                    />
                    <div className="space-y-1">
                      <Label 
                        htmlFor={item.id} 
                        className={`text-sm font-medium leading-none cursor-pointer ${isChecked ? "text-foreground line-through opacity-70" : "text-foreground"}`}
                      >
                        {item.title}
                      </Label>
                      <p className={`text-xs ${isChecked ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                        {item.desc}
                      </p>
                      {item.hint && !isChecked && (
                        <p className="text-[10px] font-mono text-primary/70 pt-1">
                          → {item.hint}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
