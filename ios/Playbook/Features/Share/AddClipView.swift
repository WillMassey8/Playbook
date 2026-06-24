import SwiftUI

/// Sheet presented when the user taps + or is redirected from the Share Extension.
struct AddClipView: View {
    /// Pre-fill from share extension; leave nil for manual entry.
    var prefillURL: URL? = nil
    var onComplete: (() -> Void)? = nil

    @State private var vm = AddClipViewModel()
    @State private var categories: [Category] = []
    @State private var isLoadingCategories = false
    @Environment(\.dismiss) private var dismiss

    private var leafCategories: [Category] {
        let parentIDs = Set(categories.compactMap(\.parentId))
        return categories
            .filter { !parentIDs.contains($0.id) }
            .sorted { $0.name < $1.name }
    }

    private func parentName(for category: Category) -> String? {
        guard let pid = category.parentId else { return nil }
        return categories.first(where: { $0.id == pid })?.name
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.pbBg.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        urlField
                        categoryPicker
                        submitSection
                    }
                    .padding(Spacing.md)
                    .padding(.top, Spacing.sm)
                }
            }
            .navigationTitle(prefillURL == nil ? "Add Clip" : "Save Clip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.pbBg, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Color.pbGreen)
                }
            }
            .task {
                if let url = prefillURL {
                    vm.urlText = url.absoluteString
                }
                await loadCategories()
            }
            .onChange(of: vm.state) { _, newState in
                if case .success = newState {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        onComplete?()
                        dismiss()
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - URL field

    private var urlField: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Label("Clip URL", systemImage: "link")
                .font(.pbHeadline)
                .foregroundStyle(.white.opacity(0.6))

            HStack {
                TextField("https://x.com/...", text: $vm.urlText)
                    .textContentType(.URL)
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .foregroundStyle(.white)
                    .font(.pbBody)

                if !vm.urlText.isEmpty {
                    Button { vm.urlText = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.white.opacity(0.3))
                    }
                }
            }
            .padding()
            .background(Color.pbCard)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))

            // Platform hint
            if let hint = platformHint {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color.pbGreen)
                    Text(hint)
                        .font(.pbCaption)
                        .foregroundStyle(.white.opacity(0.5))
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    // MARK: - Category picker

    private var categoryPicker: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Label("Category", systemImage: "folder")
                .font(.pbHeadline)
                .foregroundStyle(.white.opacity(0.6))

            if isLoadingCategories {
                HStack {
                    ProgressView().tint(Color.pbGreen)
                    Text("Loading categories…")
                        .font(.pbCallout)
                        .foregroundStyle(.white.opacity(0.4))
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.pbCard)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md))
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        ForEach(leafCategories) { category in
                            categoryChip(category)
                        }
                    }
                    .padding(.horizontal, 1)
                    .padding(.vertical, 1)
                }
            }
        }
    }

    private func categoryChip(_ category: Category) -> some View {
        let selected = vm.selectedCategoryId == category.id
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                vm.selectedCategoryId = selected ? nil : category.id
            }
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                if let parent = parentName(for: category) {
                    Text(parent)
                        .font(.pbCaption)
                        .foregroundStyle(selected ? .black.opacity(0.6) : .white.opacity(0.4))
                }
                Text(category.name)
                    .font(.pbCallout)
                    .fontWeight(.semibold)
                    .foregroundStyle(selected ? .black : .white)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(selected ? Color.pbGreen : Color.pbCard)
            .clipShape(RoundedRectangle(cornerRadius: Radius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.sm)
                    .stroke(selected ? Color.clear : Color.white.opacity(0.08), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.15), value: selected)
    }

    // MARK: - Submit

    @ViewBuilder
    private var submitSection: some View {
        switch vm.state {
        case .idle, .loading:
            Button("Save to Playbook") {
                Task { await vm.submit() }
            }
            .buttonStyle(PBButtonStyle(isLoading: vm.isLoading))
            .disabled(!vm.isValid || vm.isLoading)

        case .success(let play):
            VStack(spacing: Spacing.sm) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.pbGreen)
                Text(play.status == .ready ? "Clip saved!" : "Saved — processing video…")
                    .font(.pbHeadline)
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(Spacing.lg)
            .background(Color.pbGreen.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
            .transition(.scale.combined(with: .opacity))

        case .failure(let message):
            VStack(spacing: Spacing.md) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                    Text(message)
                        .font(.pbCallout)
                        .foregroundStyle(.white.opacity(0.8))
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.orange.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: Radius.md))

                Button("Try Again") {
                    withAnimation { vm.state = .idle }
                }
                .buttonStyle(SecondaryButtonStyle())
            }
        }
    }

    // MARK: - Helpers

    private var platformHint: String? {
        let text = vm.urlText.lowercased()
        if text.contains("twitter.com") || text.contains("x.com") { return "Twitter/X clip detected" }
        if text.contains("instagram.com") { return "Instagram clip detected (link saved)" }
        return nil
    }

    private func loadCategories() async {
        isLoadingCategories = true
        categories = (try? await SupabaseService.shared.fetchCategories()) ?? []
        isLoadingCategories = false
    }
}

#Preview {
    AddClipView()
}
