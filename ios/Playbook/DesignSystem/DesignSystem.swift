import SwiftUI

// MARK: - Colors

extension Color {
    static let pbBackground   = Color("pbBackground")
    static let pbSurface      = Color("pbSurface")
    static let pbSurface2     = Color("pbSurface2")
    static let pbAccent       = Color("pbAccent")
    static let pbAccentMuted  = Color("pbAccentMuted")
    static let pbTextPrimary  = Color("pbTextPrimary")
    static let pbTextSecondary = Color("pbTextSecondary")
    static let pbDivider      = Color("pbDivider")

    // Fallbacks when running without asset catalog (Xcode Preview)
    static let pbBg           = Color(red: 0.07, green: 0.07, blue: 0.08)
    static let pbCard         = Color(red: 0.12, green: 0.12, blue: 0.14)
    static let pbGreen        = Color(red: 0.20, green: 0.84, blue: 0.49)
}

// MARK: - Typography

extension Font {
    static let pbLargeTitle  = Font.system(size: 34, weight: .bold,   design: .default)
    static let pbTitle       = Font.system(size: 22, weight: .bold,   design: .default)
    static let pbTitle2      = Font.system(size: 18, weight: .semibold)
    static let pbHeadline    = Font.system(size: 16, weight: .semibold)
    static let pbBody        = Font.system(size: 15, weight: .regular)
    static let pbCallout     = Font.system(size: 14, weight: .regular)
    static let pbCaption     = Font.system(size: 12, weight: .regular)
    static let pbCaptionBold = Font.system(size: 12, weight: .semibold)
}

// MARK: - Spacing

enum Spacing {
    static let xs:  CGFloat = 4
    static let sm:  CGFloat = 8
    static let md:  CGFloat = 16
    static let lg:  CGFloat = 24
    static let xl:  CGFloat = 32
    static let xxl: CGFloat = 48
}

// MARK: - Corner Radii

enum Radius {
    static let sm:  CGFloat = 8
    static let md:  CGFloat = 12
    static let lg:  CGFloat = 16
    static let xl:  CGFloat = 24
    static let pill: CGFloat = 999
}

// MARK: - Category accent colors

extension Category {
    var accentColor: Color {
        let palette: [Color] = [
            Color(red: 0.20, green: 0.84, blue: 0.49), // green
            Color(red: 0.36, green: 0.61, blue: 1.00), // blue
            Color(red: 1.00, green: 0.62, blue: 0.22), // orange
            Color(red: 0.90, green: 0.33, blue: 0.33), // red
            Color(red: 0.72, green: 0.42, blue: 1.00), // purple
            Color(red: 0.26, green: 0.84, blue: 0.84), // teal
        ]
        let index = abs(name.hashValue) % palette.count
        return palette[index]
    }
}

// MARK: - Reusable modifiers

struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.pbCard)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }

    func shimmer(active: Bool = true) -> some View {
        self.overlay(
            active
                ? ShimmerView().clipShape(RoundedRectangle(cornerRadius: Radius.md))
                : nil
        )
    }
}

// MARK: - Shimmer

struct ShimmerView: View {
    @State private var phase: CGFloat = 0

    var body: some View {
        LinearGradient(
            stops: [
                .init(color: Color.white.opacity(0.0), location: phase - 0.3),
                .init(color: Color.white.opacity(0.12), location: phase),
                .init(color: Color.white.opacity(0.0), location: phase + 0.3),
            ],
            startPoint: .leading,
            endPoint: .trailing
        )
        .onAppear {
            withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                phase = 1.3
            }
        }
    }
}

// MARK: - Platform badge

struct PlatformBadge: View {
    let platform: SourcePlatform

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: iconName)
                .font(.system(size: 10, weight: .semibold))
            Text(label)
                .font(.pbCaptionBold)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(color.opacity(0.18))
        .foregroundStyle(color)
        .clipShape(Capsule())
    }

    private var iconName: String {
        switch platform {
        case .twitter:   return "bird"
        case .instagram: return "camera"
        case .unknown:   return "link"
        }
    }

    private var label: String {
        switch platform {
        case .twitter:   return "X / Twitter"
        case .instagram: return "Instagram"
        case .unknown:   return "Link"
        }
    }

    private var color: Color {
        switch platform {
        case .twitter:   return .white
        case .instagram: return Color(red: 1, green: 0.55, blue: 0.25)
        case .unknown:   return .gray
        }
    }
}

// MARK: - Status badge

struct StatusBadge: View {
    let status: PlayStatus

    var body: some View {
        HStack(spacing: 4) {
            if status == .processing || status == .pending {
                ProgressView()
                    .scaleEffect(0.6)
                    .tint(color)
            } else {
                Image(systemName: iconName)
                    .font(.system(size: 10, weight: .bold))
            }
            Text(label)
                .font(.pbCaptionBold)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(color.opacity(0.18))
        .foregroundStyle(color)
        .clipShape(Capsule())
    }

    private var iconName: String {
        switch status {
        case .ready:      return "checkmark"
        case .failed:     return "exclamationmark"
        case .processing: return "arrow.clockwise"
        case .pending:    return "clock"
        }
    }

    private var label: String {
        switch status {
        case .ready:      return "Ready"
        case .failed:     return "Failed"
        case .processing: return "Processing"
        case .pending:    return "Pending"
        }
    }

    private var color: Color {
        switch status {
        case .ready:      return Color.pbGreen
        case .failed:     return .red
        case .processing: return .yellow
        case .pending:    return .gray
        }
    }
}

// MARK: - Primary button style

struct PBButtonStyle: ButtonStyle {
    var isLoading = false

    func makeBody(configuration: Configuration) -> some View {
        ZStack {
            if isLoading {
                ProgressView().tint(.black)
            } else {
                configuration.label
                    .font(.pbHeadline)
                    .foregroundStyle(.black)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 52)
        .background(Color.pbGreen.opacity(configuration.isPressed ? 0.8 : 1))
        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.pbHeadline)
            .foregroundStyle(Color.pbGreen)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(Color.pbGreen.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
