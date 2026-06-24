import SwiftUI

struct HowToShareView: View {
    @Environment(\.dismiss) private var dismiss

    private let steps: [(icon: String, title: String, detail: String)] = [
        ("1.circle.fill", "Find a clip on X or Instagram", "Open any post with a play you want to save."),
        ("2.circle.fill", "Tap Share", "Use the share button on the post."),
        ("3.circle.fill", "Choose Playbook AI", "Select Playbook from the share sheet."),
        ("4.circle.fill", "Pick a category", "Tag the clip so you can find it later in your Playbook."),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    Text("Save clips in two taps")
                        .font(.pbTitle)
                        .foregroundStyle(.white)

                    Text("Share from X or Instagram straight into your playbook — no more lost group chat clips.")
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
