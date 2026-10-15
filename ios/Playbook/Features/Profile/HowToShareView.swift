import SwiftUI

struct HowToShareView: View {
    @Environment(\.dismiss) private var dismiss

    private let steps: [(icon: String, title: String, detail: String)] = [
        ("1.circle.fill", "Find a clip on X, TikTok, Instagram, or Facebook", "Open any post with a play you want to save."),
        ("2.circle.fill", "Tap Share → Playbook", "You’ll see Saved to Playbook ✓ — no questions in the share sheet."),
        ("3.circle.fill", "Open Playbook", "The clip pops full-screen with the video playing."),
        ("4.circle.fill", "Categorize it", "Pick a play type so it lands in your playbook."),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    Text("Share now. Sort later.")
                        .font(.pbTitle)
                        .foregroundStyle(.white)

                    Text("Share from X, TikTok, Instagram, or Facebook — Playbook saves it instantly. Categorize when you’re back in the app.")
                        .font(.pbCallout)
                        .foregroundStyle(.white.opacity(0.55))

                    VStack(spacing: Spacing.sm) {
                        ForEach(Array(steps.enumerated()), id: \.offset) { _, step in
                            HStack(alignment: .top, spacing: Spacing.md) {
                                Image(systemName: step.icon)
                                    .font(.system(size: 22))
                                    .foregroundStyle(Color.pbGreen)
                                    .frame(width: 28)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(step.title)
                                        .font(.pbHeadline)
                                        .foregroundStyle(.white)
                                    Text(step.detail)
                                        .font(.pbCallout)
                                        .foregroundStyle(.white.opacity(0.5))
                                }
                            }
                            .padding(Spacing.md)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.pbCard)
                            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                        }
                    }
                }
                .padding(Spacing.lg)
            }
            .background(Color.pbBg.ignoresSafeArea())
            .navigationTitle("How to Share")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Color.pbGreen)
                }
            }
            .toolbarBackground(Color.pbBg, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    HowToShareView()
}
