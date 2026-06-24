import SwiftUI

// MARK: - Main view

struct CategorizeShareView: View {
    let sharedURL: URL
    var onComplete: () -> Void
    var onCancel: () -> Void
    var openMainApp: (() -> Void)? = nil

    // Category data
    @State private var allCategories: [ShareIngestService.ShareCategory] = []
    @State private var isLoadingCategories = true

    // Selections
    @State private var selectedParent: ShareIngestService.ShareCategory? = nil
    @State private var selectedSub:    ShareIngestService.ShareCategory? = nil

    // Submission state
    enum SubmitState { case idle, loading, success, failure(String) }
    @State private var submitState: SubmitState = .idle

    // MARK: Derived

    private var parents: [ShareIngestService.ShareCategory] {
        allCategories.filter { $0.parentId == nil }
    }

    private func subcategories(of parent: ShareIngestService.ShareCategory) -> [ShareIngestService.ShareCategory] {
        allCategories.filter { $0.parentId == parent.id }
    }

    private var canSubmit: Bool {
        guard case .idle = submitState else { return false }
        guard selectedParent != nil else { return false }
        let subs = selectedParent.map { subcategories(of: $0) } ?? []
        return subs.isEmpty || selectedSub != nil
    }

    private var effectiveCategoryId: String? {
        (selectedSub ?? selectedParent)?.id
    }

    private var platformLabel: String {
        let host = sharedURL.host ?? ""
        if host.contains("twitter") || host.contains("x.com") { return "Twitter / X" }
        if host.contains("instagram")                          { return "Instagram" }
        return sharedURL.host ?? "Link"
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            Color(red: 0.04, green: 0.04, blue: 0.06).ignoresSafeArea()

            VStack(spacing: 0) {
                handle
                header
                Divider().background(Color.white.opacity(0.08))
                content
            }
        }
        .preferredColorScheme(.dark)
        .task { await loadCategories() }
    }

    // MARK: - Sub-views

    private var handle: some View {
        RoundedRectangle(cornerRadius: 3)
            .fill(Color.white.opacity(0.2))
            .frame(width: 36, height: 5)
            .padding(.top, 10)
            .padding(.bottom, 8)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text("Save to Playbook AI")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
                Label(platformLabel, systemImage: "link")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.45))
                    .lineLimit(1)
            }
            Spacer()
            Button(action: onCancel) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(.white.opacity(0.3))
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }

    @ViewBuilder
    private var content: some View {
        switch submitState {
        case .loading:
            savingView
        case .success:
            successView
        case .failure(let msg):
            errorView(message: msg)
        default:
            pickerContent
        }
    }

    private var pickerContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                if isLoadingCategories {
                    HStack {
                        ProgressView().tint(.white)
                        Text("Loading categories…")
                            .font(.system(size: 14))
                            .foregroundStyle(.white.opacity(0.4))
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 30)
                } else {
                    // Step 1 — Play type
                    categorySection(
                        title: "Play Type",
                        items: parents,
                        selected: selectedParent
                    ) { tapped in
                        withAnimation(.easeInOut(duration: 0.15)) {
                            if selectedParent?.id == tapped.id {
                                selectedParent = nil
                                selectedSub    = nil
                            } else {
                                selectedParent = tapped
                                selectedSub    = nil
                            }
                        }
                    }

                    // Step 2 — Subcategory (only if parent has children)
                    if let parent = selectedParent {
                        let subs = subcategories(of: parent)
                        if !subs.isEmpty {
                            categorySection(
                                title: "Sub-Category",
                                items: subs,
                                selected: selectedSub
                            ) { tapped in
                                withAnimation(.easeInOut(duration: 0.15)) {
                                    selectedSub = selectedSub?.id == tapped.id ? nil : tapped
                                }
                            }
                            .transition(.move(edge: .top).combined(with: .opacity))
                        }
                    }
                }

                // Save button
                Button(action: submit) {
                    Text(canSubmit ? "Save to Playbook" : "Select a Play Type")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(canSubmit ? .black : .white.opacity(0.35))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(canSubmit
                                    ? Color(red: 0.2, green: 0.84, blue: 0.49)
                                    : Color.white.opacity(0.07))
                        )
                }
                .disabled(!canSubmit)
                .animation(.easeInOut(duration: 0.15), value: canSubmit)
                .padding(.top, 4)
            }
            .padding(20)
            .padding(.bottom, 12)
        }
    }

    private var savingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.3)
                .tint(Color(red: 0.2, green: 0.84, blue: 0.49))
            Text("Saving to Playbook…")
                .font(.system(size: 15))
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(60)
    }

    private var successView: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color(red: 0.2, green: 0.84, blue: 0.49))
            Text("Clip saved!")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.white)
            Text("Your play will appear in the feed shortly.")
                .font(.system(size: 13))
                .foregroundStyle(.white.opacity(0.45))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(50)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                onComplete()
            }
        }
    }

    private func errorView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundStyle(.orange)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
            Button("Try Again") {
                withAnimation { submitState = .idle }
            }
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Color(red: 0.2, green: 0.84, blue: 0.49))
        }
        .frame(maxWidth: .infinity)
        .padding(40)
    }

    // MARK: - Category section

    private func categorySection(
        title: String,
        items: [ShareIngestService.ShareCategory],
        selected: ShareIngestService.ShareCategory?,
        onTap: @escaping (ShareIngestService.ShareCategory) -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white.opacity(0.35))
                .kerning(0.8)

            FlowLayout(spacing: 10) {
                ForEach(items) { item in
                    chipButton(item, isSelected: selected?.id == item.id, onTap: onTap)
                }
            }
        }
    }

    private func chipButton(
        _ item: ShareIngestService.ShareCategory,
        isSelected: Bool,
        onTap: @escaping (ShareIngestService.ShareCategory) -> Void
    ) -> some View {
        Button { onTap(item) } label: {
            Text(item.name)
                .font(.system(size: 14, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? .black : .white.opacity(0.8))
                .padding(.horizontal, 16)
                .padding(.vertical, 9)
                .background(
                    RoundedRectangle(cornerRadius: 99)
                        .fill(isSelected
                            ? Color(red: 0.2, green: 0.84, blue: 0.49)
                            : Color.white.opacity(0.08))
                        .overlay(
                            RoundedRectangle(cornerRadius: 99)
                                .stroke(
                                    isSelected ? Color.clear : Color.white.opacity(0.12),
                                    lineWidth: 1
                                )
                        )
                )
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.15), value: isSelected)
    }

    // MARK: - Actions

    private func loadCategories() async {
        guard let jwt = SharedURLStore.loadUserToken() else {
            // No JWT — fall back to hardcoded defaults so the user can still pick
            allCategories = ShareIngestService.ShareCategory.defaults
            isLoadingCategories = false
            return
        }
        do {
            allCategories = try await ShareIngestService.fetchCategories(jwt: jwt)
        } catch {
            allCategories = ShareIngestService.ShareCategory.defaults
        }
        isLoadingCategories = false
    }

    private func submit() {
        guard canSubmit else { return }
        let jwt = SharedURLStore.loadUserToken()
        let catId = effectiveCategoryId
        let urlString = sharedURL.absoluteString

        withAnimation { submitState = .loading }

        Task {
            do {
                if let token = jwt {
                    _ = try await ShareIngestService.ingest(
                        jwt: token,
                        sourceURL: urlString,
                        categoryId: catId
                    )
                } else {
                    SharedURLStore.savePendingURL(sharedURL)
                    openMainApp?()
                }
                await MainActor.run {
                    withAnimation { submitState = .success }
                }
            } catch {
                await MainActor.run {
                    withAnimation { submitState = .failure(error.localizedDescription) }
                }
            }
        }
    }
}

// MARK: - Hardcoded defaults (fallback if network unavailable)

extension ShareIngestService.ShareCategory {
    static let defaults: [ShareIngestService.ShareCategory] = [
        .init(id: "pass",         parentId: nil,    name: "Pass Plays",   sortOrder: 1),
        .init(id: "pass-rub",     parentId: "pass", name: "Rub Routes",   sortOrder: 1),
        .init(id: "pass-screen",  parentId: "pass", name: "Screen Passes",sortOrder: 2),
        .init(id: "pass-deep",    parentId: "pass", name: "Deep Shots",   sortOrder: 3),
        .init(id: "run",          parentId: nil,    name: "Run Plays",    sortOrder: 2),
        .init(id: "run-inside",   parentId: "run",  name: "Inside Zone",  sortOrder: 1),
        .init(id: "run-outside",  parentId: "run",  name: "Outside Zone", sortOrder: 2),
        .init(id: "rpo",          parentId: nil,    name: "RPOs",         sortOrder: 3),
        .init(id: "rpo-glance",   parentId: "rpo",  name: "Glance RPO",   sortOrder: 1),
        .init(id: "rpo-bubble",   parentId: "rpo",  name: "Bubble RPO",   sortOrder: 2),
        .init(id: "trick",        parentId: nil,    name: "Trick Plays",  sortOrder: 4),
    ]
}

// MARK: - Simple flow layout for chips

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        layout(subviews: subviews, in: proposal.replacingUnspecifiedDimensions().width).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(subviews: subviews, in: bounds.width)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY),
                proposal: ProposedViewSize(frame.size)
            )
        }
    }

    private struct LayoutResult {
        var size: CGSize
        var frames: [CGRect]
    }

    private func layout(subviews: Subviews, in width: CGFloat) -> LayoutResult {
        var frames: [CGRect] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            frames.append(CGRect(origin: CGPoint(x: x, y: y), size: size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }

        return LayoutResult(
            size: CGSize(width: width, height: y + rowHeight),
            frames: frames
        )
    }
}
