import SwiftUI

struct AuthView: View {
    var showTrialSubtitle: Bool = false
    var onBack: (() -> Void)? = nil

    @State private var vm = AuthViewModel()
    @FocusState private var focusedField: Field?

    enum Field { case email, password }

    var body: some View {
        ZStack {
            Color.pbBg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    if let onBack {
                        HStack {
                            Button(action: onBack) {
                                HStack(spacing: 6) {
                                    Image(systemName: "chevron.left")
                                    Text("Back")
                                }
                                .font(.pbCallout)
                                .foregroundStyle(.white.opacity(0.5))
                            }
                            .buttonStyle(.plain)
                            Spacer()
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.top, Spacing.md)
                    }

                    // Hero
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "film.stack")
                            .font(.system(size: 52, weight: .semibold))
                            .foregroundStyle(Color.pbGreen)
                            .padding(.bottom, Spacing.sm)

                        Text("Playbook")
                            .font(.pbLargeTitle)
                            .foregroundStyle(.white)

                        Text(showTrialSubtitle
                             ? "Create your account to start your trial"
                             : "Your football film library")
                            .font(.pbCallout)
                            .foregroundStyle(.white.opacity(0.55))
                    }
                    .padding(.top, Spacing.xxl)
                    .padding(.bottom, Spacing.xl)

                    // Mode picker
                    HStack(spacing: 0) {
                        ForEach([AuthMode.signIn, .signUp], id: \.self) { m in
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) { vm.mode = m }
                            } label: {
                                Text(m == .signIn ? "Sign In" : "Sign Up")
                                    .font(.pbHeadline)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .foregroundStyle(vm.mode == m ? .black : .white.opacity(0.5))
                                    .background(
                                        vm.mode == m
                                        ? Color.pbGreen
                                        : Color.clear
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: Radius.sm))
                            }
                        }
                    }
                    .padding(4)
                    .background(Color.pbCard)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.sm + 4))
                    .padding(.horizontal, Spacing.md)

                    // Fields
                    VStack(spacing: Spacing.sm) {
                        TextField("Email", text: $vm.email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .password }
                            .padding()
                            .background(Color.pbCard)
                            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                            .foregroundStyle(.white)

                        SecureField("Password (6+ characters)", text: $vm.password)
                            .textContentType(vm.mode == .signUp ? .newPassword : .password)
                            .focused($focusedField, equals: .password)
                            .submitLabel(.done)
                            .onSubmit { Task { await vm.submit() } }
                            .padding()
                            .background(Color.pbCard)
                            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                            .foregroundStyle(.white)

                        if let error = vm.errorMessage {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "exclamationmark.circle.fill")
                                Text(error)
                                    .font(.pbCallout)
                            }
                            .foregroundStyle(.red)
                            .padding(Spacing.sm)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: Radius.sm))
                        }

                        Button(vm.mode == .signIn ? "Sign In" : "Create Account") {
                            focusedField = nil
                            Task { await vm.submit() }
                        }
                        .buttonStyle(PBButtonStyle(isLoading: vm.isLoading))
                        .disabled(!vm.isValid || vm.isLoading)
                        .padding(.top, Spacing.xs)
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.top, Spacing.lg)

                    // Footer note for sign up
                    if vm.mode == .signUp {
                        Text("A confirmation email may be sent if required by your auth settings.")
                            .font(.pbCaption)
                            .foregroundStyle(.white.opacity(0.4))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Spacing.xl)
                            .padding(.top, Spacing.md)
                    }

                    Spacer(minLength: Spacing.xxl)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    AuthView()
}
