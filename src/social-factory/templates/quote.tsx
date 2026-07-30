import React from "react";
import { colors, spacing } from "../brand/tokens";
import { type QuoteProps } from "../schema/types";

export const QuoteTemplate = ({ headline, quote, author, logoVariant, backgroundStyle }: QuoteProps) => {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                width: spacing.canvasWidth,
                height: spacing.canvasHeight,
                backgroundColor: colors.background,
                color: colors.foreground,
                fontFamily: "var(--font-jakarta)",
                padding: spacing.padding,
                backgroundImage: backgroundStyle === "gradient"
                    ? "linear-gradient(to bottom right, #000000, #1a1a1a)"
                    : undefined,
                position: "relative",
            }}
        >
            {/* Content Area within Safe Zones */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    marginTop: spacing.safeTop,
                    marginBottom: spacing.safeBottom,
                    height: spacing.canvasHeight - spacing.safeTop - spacing.safeBottom,
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    width: "100%",
                }}
            >
                {headline && (
                    <div
                        style={{
                            fontSize: 48,
                            fontWeight: 700,
                            marginBottom: 40,
                            opacity: 0.8,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                        }}
                    >
                        {headline}
                    </div>
                )}

                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 500,
                        lineHeight: 1.2,
                        marginBottom: 60,
                        maxWidth: 900,
                    }}
                >
                    &ldquo;{quote}&rdquo;
                </div>

                <div
                    style={{
                        fontSize: 42,
                        fontWeight: 400,
                        opacity: 0.7,
                        fontStyle: "italic",
                    }}
                >
                    — {author}
                </div>
            </div>

            {/* Brand Logo - Bottom center */}
            <div
                style={{
                    position: "absolute",
                    bottom: 100,
                    left: 0,
                    right: 0,
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <div style={{ fontSize: 32, opacity: 0.5 }}>k3rn.labs</div>
            </div>
        </div>
    );
};
