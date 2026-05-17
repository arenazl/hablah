import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Sparkles, ChevronRight, ChevronLeft, Rocket, ExternalLink,
  Lightbulb, ClipboardList, FileText, Users, TrendingUp,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * NOTA libreria core: este componente recibe el `hint` como prop.
 * La config de hints por pantalla (ej. `PAGE_HINTS[pageId]`) vive en el
 * proyecto cliente. Aca el componente solo renderiza.
 */
export interface HintStep {
  title: string;
  description?: string;
  icon?: string;
  cta?: { label: string; href: string; external?: boolean };
}

export interface PageHintData {
  title?: string;
  description?: string;
  accent?: 'blue' | 'violet' | 'emerald' | 'amber';
  steps?: HintStep[];
  cta?: { label: string; href: string; external?: boolean };
}

// Mapa de íconos disponibles para los steps (por nombre)
const ICON_MAP: Record<string, typeof Sparkles> = {
  Sparkles,
  Rocket,
  Lightbulb,
  ClipboardList,
  FileText,
  Users,
  TrendingUp,
};

// Paleta por accent
const ACCENT_STYLES = {
  blue: {
    gradient: 'from-blue-50 via-blue-50/40 to-indigo-50/60',
    border: 'border-blue-100',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    chipBg: 'bg-blue-100/60',
    chipText: 'text-blue-700',
    title: 'text-blue-950',
    body: 'text-blue-900/80',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    buttonGhost: 'text-blue-700 hover:bg-blue-100',
    accentBar: 'bg-blue-500',
    closeHover: 'hover:bg-blue-100',
    closeColor: 'text-blue-600',
    dotActive: 'bg-blue-600',
    dotInactive: 'bg-blue-200',
  },
  violet: {
    gradient: 'from-violet-50 via-fuchsia-50/40 to-indigo-50/50',
    border: 'border-violet-100',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    chipBg: 'bg-violet-100/60',
    chipText: 'text-violet-700',
    title: 'text-violet-950',
    body: 'text-violet-900/80',
    button: 'bg-violet-600 hover:bg-violet-700 text-white',
    buttonGhost: 'text-violet-700 hover:bg-violet-100',
    accentBar: 'bg-violet-500',
    closeHover: 'hover:bg-violet-100',
    closeColor: 'text-violet-600',
    dotActive: 'bg-violet-600',
    dotInactive: 'bg-violet-200',
  },
  emerald: {
    gradient: 'from-emerald-50 via-teal-50/40 to-cyan-50/50',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    chipBg: 'bg-emerald-100/60',
    chipText: 'text-emerald-700',
    title: 'text-emerald-950',
    body: 'text-emerald-900/80',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    buttonGhost: 'text-emerald-700 hover:bg-emerald-100',
    accentBar: 'bg-emerald-500',
    closeHover: 'hover:bg-emerald-100',
    closeColor: 'text-emerald-600',
    dotActive: 'bg-emerald-600',
    dotInactive: 'bg-emerald-200',
  },
  amber: {
    gradient: 'from-amber-50 via-orange-50/40 to-rose-50/50',
    border: 'border-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    chipBg: 'bg-amber-100/60',
    chipText: 'text-amber-700',
    title: 'text-amber-950',
    body: 'text-amber-900/80',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
    buttonGhost: 'text-amber-700 hover:bg-amber-100',
    accentBar: 'bg-amber-500',
    closeHover: 'hover:bg-amber-100',
    closeColor: 'text-amber-600',
    dotActive: 'bg-amber-600',
    dotInactive: 'bg-amber-200',
  },
};

interface PageHintProps {
  /** ID unico de la pantalla, usado para la key de localStorage del dismiss. */
  pageId: string;
  /** Data del hint (titulo, body, steps). Si no se pasa, no renderiza nada. */
  hint?: PageHintData;
  /** Sufijo extra para la key de localStorage (ej. tenant id, municipio).
   *  Default: 'default'. Permite que el mismo pageId tenga dismiss
   *  separado por scope. */
  scopeKey?: string;
  /** Nombre del evento que dispara reset del dismiss (ej. cuando cambia
   *  el tenant). Default: ninguno. */
  resetEventName?: string;
}

/**
 * Hint contextual arriba de cada pantalla de gestión.
 *
 * Soporta dos modos (definidos en `config/pageHints.ts`):
 *   - Simple: card con título + descripción.
 *   - Wizard: mini tutorial multi-paso con navegación Next/Back y progress.
 *
 * El dismiss se persiste en localStorage por pageId.
 */
export default function PageHint({ pageId, hint, scopeKey, resetEventName }: PageHintProps) {
  const { theme } = useTheme();
  const scope = scopeKey || 'default';
  const storageKey = `hint_dismissed_${pageId}_${scope}`;
  const isWizard = !!hint?.steps?.length;
  void ACCENT_STYLES;

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) === 'true';
  });
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === 'true');
    setStepIdx(0);
  }, [storageKey]);

  // Si se especifica un evento de reset, escuchalo para revalidar el dismiss.
  useEffect(() => {
    if (!resetEventName) return;
    const onReset = () => {
      setDismissed(localStorage.getItem(storageKey) === 'true');
      setStepIdx(0);
    };
    window.addEventListener(resetEventName, onReset);
    return () => window.removeEventListener(resetEventName, onReset);
  }, [resetEventName, storageKey]);

  const steps = hint?.steps ?? [];
  const currentStep: HintStep | undefined = steps[stepIdx];
  const isLastStep = stepIdx === steps.length - 1;

  const IconComponent = useMemo(() => {
    if (isWizard && currentStep?.icon) {
      return ICON_MAP[currentStep.icon] ?? Sparkles;
    }
    return Lightbulb;
  }, [isWizard, currentStep]);

  if (!hint || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  const handleNext = () => {
    if (isLastStep) {
      handleDismiss();
    } else {
      setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    }
  };

  const handleBack = () => setStepIdx((i) => Math.max(i - 1, 0));

  // Todos los colores derivan de theme.primary para respetar la paleta activa
  const primary = theme.primary;

  return (
    <div
      className="relative mb-3 overflow-hidden rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-400"
      style={{
        background: `linear-gradient(135deg, ${primary}12 0%, ${primary}06 60%, ${theme.card} 100%)`,
        border: `1px solid ${primary}30`,
      }}
    >
      {/* Barra de acento decorativa arriba */}
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: primary }} />

      <div className="p-2.5 md:p-3">
        <div className="flex items-start gap-2.5">
          {/* Ícono */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
            style={{ backgroundColor: `${primary}20`, color: primary }}
          >
            <IconComponent className="h-3.5 w-3.5" strokeWidth={2.2} />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            {/* Chip superior (solo en wizard) */}
            {isWizard && (
              <div
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-1"
                style={{ backgroundColor: `${primary}20`, color: primary }}
              >
                <Sparkles className="h-2.5 w-2.5" />
                Tutorial · {stepIdx + 1}/{steps.length}
              </div>
            )}

            <h3 className="text-sm font-bold mb-0.5 leading-tight" style={{ color: theme.text }}>
              {isWizard ? currentStep?.title : hint.title}
            </h3>
            <p className="text-xs leading-snug" style={{ color: theme.textSecondary }}>
              {isWizard ? currentStep?.description : hint.description}
            </p>

            {/* CTA del step (si tiene link) */}
            {isWizard && currentStep?.cta && (
              <Link
                to={currentStep.cta.href}
                className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
                style={{
                  backgroundColor: `${primary}15`,
                  color: primary,
                  border: `1px solid ${primary}30`,
                }}
              >
                {currentStep.cta.label}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}

            {/* Navegación del wizard */}
            {isWizard && (
              <div className="mt-2 flex items-center justify-between gap-2">
                {/* Indicador de progreso con puntos */}
                <div className="flex items-center gap-1.5">
                  {steps.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setStepIdx(idx)}
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: idx === stepIdx ? 24 : 6,
                        backgroundColor: idx === stepIdx ? primary : `${primary}40`,
                      }}
                      aria-label={`Ir al paso ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Botones */}
                <div className="flex items-center gap-1">
                  {stepIdx > 0 && (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium transition hover:scale-[1.02]"
                      style={{ backgroundColor: `${primary}12`, color: primary }}
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Atrás
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-0.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shadow-sm hover:scale-[1.02]"
                    style={{
                      background: `linear-gradient(135deg, ${primary}, ${primary}dd)`,
                      color: theme.primaryText || '#ffffff',
                    }}
                  >
                    {isLastStep ? (
                      <>
                        Empezar
                        <Rocket className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Siguiente
                        <ChevronRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botón cerrar */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:brightness-125"
            style={{ backgroundColor: `${primary}15`, color: primary }}
            aria-label="Ocultar sugerencia"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
