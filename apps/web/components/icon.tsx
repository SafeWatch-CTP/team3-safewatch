/**
 * The icon PNGs in /public/icons are white glyphs on transparency, so they
 * disappear on a light surface. Painting them as a CSS mask instead of an
 * <img> makes the glyph take currentColor, so an icon follows the text colour
 * of whatever it sits in.
 */

export function Icon({src, size = 24, className = ""}: {src: string; size?: number; className?: string}) {
    return (
        <span
            aria-hidden="true"
            className={`inline-block shrink-0 bg-current ${className}`}
            style={{
                width: size,
                height: size,
                maskImage: `url(${src})`,
                WebkitMaskImage: `url(${src})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
            }}
        />
    );
}
