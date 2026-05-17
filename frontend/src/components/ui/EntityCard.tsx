import { type ReactNode } from 'react';
import { MapPin, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * EntityCard — card agnostica para listar entidades con titulo, badges,
 * estado, deadline y meta. 100% agnostico: no sabe de reclamos, tramites,
 * gastos. El wrapper de cliente arma los props con la logica de negocio.
 *
 * Patron canonico:
 *
 *   <EntityCard
 *     title={reclamo.titulo}
 *     description={reclamo.descripcion}
 *     icon={<MapPin />}
 *     iconColor={categoria.color}
 *     leftBorderColor={dependencia.color}
 *     category={{ label: categoria.nombre, color: categoria.color }}
 *     createdAt={reclamo.created_at}
 *     updatedAt={reclamo.updated_at}
 *     subtitle={dependencia.nombre}
 *     address={reclamo.direccion}
 *     statusBadge={{ label: 'Recibido', color: '#0891b2', textColor: '#fff' }}
 *     deadline={{ label: 'Hoy', color: '#f59e0b' }}
 *     idLabel={\`#\${reclamo.id}\`}
 *     onClick={() => openDetalle(reclamo)}
 *   />
 */

export interface Badge {
  label: string;
  color: string;
  /** Solido (background == color) o tinte (background == color20). Default 'tint' */
  variant?: 'solid' | 'tint';
}

export interface EntityCardProps {
  title: string;
  description?: string;
  /** Icono o imagen a la izquierda */
  icon?: ReactNode;
  iconColor?: string;
  iconImageUrl?: string;
  /** Color del borde izquierdo grueso (4px) */
  leftBorderColor?: string;
  /** Categoria como chip pequeno al lado del titulo */
  category?: Badge;
  /** Subtitulo destacado (ej: dependencia asignada) */
  subtitle?: string;
  subtitleColor?: string;
  /** Fecha de creacion */
  createdAt?: string | Date;
  /** Fecha de actualizacion (se muestra en footer si difiere de createdAt) */
  updatedAt?: string | Date;
  /** Direccion / ubicacion en el footer */
  address?: string;
  /** Estado principal (chip a la derecha del footer) */
  statusBadge?: { label: string; color: string; textColor?: string };
  /** Deadline / vencimiento con icono de alerta */
  deadline?: { label: string; color: string };
  /** Label tipo "#123" */
  idLabel?: string;
  /** Badges secundarios al lado del status (ej: similares, prioridad) */
  extraBadges?: Badge[];
  /** Indicador de actividad reciente (dot animado) */
  activityIndicator?: { color: string; tooltip?: string; pulse?: boolean };
  /** Render libre al final del footer */
  footerRight?: ReactNode;

  onClick?: () => void;
  /** Animacion de entrada controlada externamente */
  isVisible?: boolean;
  animationDelay?: number;
  className?: string;
}

const DATE_OPTS_TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

function toDate(v: string | Date | undefined): Date | null {
  if (!v) return null;
  return typeof v === 'string' ? new Date(v) : v;
}

export function EntityCard({
  title,
  description,
  icon,
  iconColor,
  iconImageUrl,
  leftBorderColor,
  category,
  subtitle,
  subtitleColor,
  createdAt,
  updatedAt,
  address,
  statusBadge,
  deadline,
  idLabel,
  extraBadges,
  activityIndicator,
  footerRight,
  onClick,
  isVisible = true,
  animationDelay = 0,
  className = '',
}: EntityCardProps) {
  const { theme } = useTheme();
  const created = toDate(createdAt);
  const updated = toDate(updatedAt);
  const hasUpdate = created && updated && updated.getTime() > created.getTime() + 60000;
  const border = leftBorderColor || theme.border;

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl ${onClick ? 'cursor-pointer' : ''} overflow-hidden transition-all duration-500 hover:shadow-lg active:scale-[0.98] ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
      } ${className}`}
      style={{
        backgroundColor: theme.card,
        border: `2px solid ${border}40`,
        borderLeftWidth: '4px',
        borderLeftColor: border,
        transitionDelay: `${animationDelay}ms`,
      }}
    >
      <div className="p-4">
        {/* Header: Icono + Contenido */}
        <div className="flex gap-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: `${iconColor || theme.primary}15` }}
          >
            {iconImageUrl ? (
              <img src={iconImageUrl} alt="" className="w-full h-full object-cover" />
            ) : icon ? (
              <span style={{ color: iconColor || theme.primary }}>{icon}</span>
            ) : (
              <MapPin className="h-8 w-8" style={{ color: iconColor || theme.primary }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold line-clamp-2 leading-tight" style={{ color: theme.text }}>
              {title}
            </p>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {category && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: `${category.color}15`, color: category.color }}
                >
                  {category.label}
                </span>
              )}
              {created && (
                <span className="text-xs flex items-center gap-1" style={{ color: theme.textSecondary }}>
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="flex flex-col leading-tight">
                    <span>{created.toLocaleDateString('es-AR')}</span>
                    <span className="text-[9px] opacity-70">
                      {created.toLocaleTimeString('es-AR', DATE_OPTS_TIME)}
                    </span>
                  </span>
                </span>
              )}
            </div>

            {subtitle && (
              <p
                className="text-xs mt-1.5 truncate"
                style={{ color: subtitleColor || theme.primary }}
              >
                {subtitle}
              </p>
            )}

            {description && (
              <p className="text-sm mt-2 line-clamp-2" style={{ color: theme.textSecondary }}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        {(address || statusBadge || idLabel || deadline || extraBadges?.length || footerRight) && (
          <div
            className="flex items-center justify-between mt-3 pt-3 text-xs"
            style={{ borderTop: `1px solid ${theme.border}` }}
          >
            {address ? (
              <span className="flex items-center truncate flex-1 min-w-0" style={{ color: theme.textSecondary }}>
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{address}</span>
              </span>
            ) : <span className="flex-1" />}

            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {hasUpdate && updated && (
                <span className="flex items-center gap-1 hidden sm:flex" style={{ color: theme.textSecondary }}>
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="flex flex-col leading-tight text-[10px]">
                    <span>{updated.toLocaleDateString('es-AR')}</span>
                    <span className="text-[8px] opacity-70">
                      {updated.toLocaleTimeString('es-AR', DATE_OPTS_TIME)}
                    </span>
                  </span>
                </span>
              )}

              {deadline && (
                <span className="flex items-center gap-1 font-medium" style={{ color: deadline.color }}>
                  <AlertTriangle className="h-3 w-3" />
                  {deadline.label}
                </span>
              )}

              {extraBadges?.map((b, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded-full font-medium"
                  style={
                    b.variant === 'solid'
                      ? { backgroundColor: b.color, color: '#fff' }
                      : { backgroundColor: `${b.color}20`, color: b.color, border: `1px solid ${b.color}40` }
                  }
                >
                  {b.label}
                </span>
              ))}

              {activityIndicator && (
                <span
                  className={`flex items-center gap-1 text-[10px] ${activityIndicator.pulse ? 'animate-pulse' : ''}`}
                  style={{ color: activityIndicator.color }}
                  title={activityIndicator.tooltip}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: activityIndicator.color,
                      boxShadow: `0 0 0 2px ${activityIndicator.color}40`,
                    }}
                  />
                </span>
              )}

              {idLabel && (
                <span
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: theme.backgroundSecondary, color: theme.textSecondary }}
                >
                  {idLabel}
                </span>
              )}

              {statusBadge && (
                <span
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md"
                  style={{
                    backgroundColor: statusBadge.color,
                    color: statusBadge.textColor || '#fff',
                  }}
                >
                  {statusBadge.label}
                </span>
              )}

              {footerRight}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
