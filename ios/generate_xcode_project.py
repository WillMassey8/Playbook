#!/usr/bin/env python3
"""Generate Playbook.xcodeproj from ios/ source tree (no XcodeGen required)."""
import os
import uuid

ROOT = os.path.dirname(os.path.abspath(__file__))


def uid():
    return uuid.uuid4().hex[:24].upper()


ids = {}


def gid(key):
    if key not in ids:
        ids[key] = uid()
    return ids[key]


def collect_files(folder, extensions):
    out = []
    for dirpath, dirnames, files in os.walk(os.path.join(ROOT, folder)):
        if any(part.endswith(".xcassets") for part in dirpath.replace("\\", "/").split("/")):
            dirnames[:] = []
            continue
        for f in files:
            if any(f.endswith(ext) for ext in extensions):
                rel = os.path.relpath(os.path.join(dirpath, f), ROOT).replace("\\", "/")
                out.append(rel)
    return sorted(out)


def collect_xcassets(folder):
    out = []
    for dirpath, dirnames, _ in os.walk(os.path.join(ROOT, folder)):
        if dirpath.endswith(".xcassets"):
            rel = os.path.relpath(dirpath, ROOT).replace("\\", "/")
            out.append(rel)
            dirnames[:] = []
    return sorted(out)


app_swift = collect_files("Playbook", [".swift"])
ext_swift = collect_files("PlaybookShareExtension", [".swift"])
app_resources = collect_xcassets("Playbook")

file_refs = {}
build_files = {}


def file_ref(path):
    key = f"file:{path}"
    if key not in file_refs:
        file_refs[key] = gid(key)
        build_files[key] = gid(f"build:{path}")
    return file_refs[key], build_files[key]


PROJECT = gid("project")
MAIN_GROUP = gid("main_group")
PRODUCTS_GROUP = gid("products")
APP_TARGET = gid("app_target")
EXT_TARGET = gid("ext_target")
APP_PRODUCT = gid("app_product")
EXT_PRODUCT = gid("ext_product")
APP_FRAMEWORKS = gid("app_frameworks")
EXT_FRAMEWORKS = gid("ext_frameworks")
BUILD_APP = gid("build_app")
BUILD_EXT = gid("build_ext")
APP_RESOURCES_PHASE = gid("app_resources")
EXT_RESOURCES_PHASE = gid("ext_resources")
EMBED_PHASE = gid("embed")
APP_CONFIG_LIST = gid("app_config_list")
EXT_CONFIG_LIST = gid("ext_config_list")
PROJECT_CONFIG_LIST = gid("project_config_list")
DEBUG_CONFIG = gid("debug")
RELEASE_CONFIG = gid("release")
APP_DEBUG = gid("app_debug")
APP_RELEASE = gid("app_release")
EXT_DEBUG = gid("ext_debug")
EXT_RELEASE = gid("ext_release")
PACKAGE_REF = gid("pkg_ref")
SUPABASE_PROD = gid("supabase_prod")
APP_DEP = gid("app_dep")
PROXY = gid("proxy")
SUPABASE_LINK = gid("supabase_link")
EMBED_BF = gid("embed_bf")

group_ids = {}


def ensure_group(rel_path):
    parts = rel_path.split("/")
    for i in range(1, len(parts) + 1):
        key = "/".join(parts[:i])
        if key not in group_ids:
            group_ids[key] = gid(f"group:{key}")
    return group_ids[rel_path]


def group_children(rel_dir):
    children = []
    subdirs = set()
    prefix = rel_dir + "/"
    all_paths = (
        app_swift
        + ext_swift
        + app_resources
        + [
            "Playbook/Info.plist",
            "Playbook/Playbook.entitlements",
            "PlaybookShareExtension/Info.plist",
            "PlaybookShareExtension/PlaybookShareExtension.entitlements",
        ]
    )
    for path in all_paths:
        if path == rel_dir:
            children.append(file_ref(path)[0])
        elif path.startswith(prefix):
            rest = path[len(prefix) :]
            if "/" in rest:
                subdirs.add(rest.split("/")[0])
            else:
                children.append(file_ref(path)[0])
    for sub in sorted(subdirs):
        children.append(ensure_group(f"{rel_dir}/{sub}"))
    return children


lines = [
    "// !$*UTF8*$!",
    "{",
    "\tarchiveVersion = 1;",
    "\tclasses = {",
    "\t};",
    "\tobjectVersion = 56;",
    "\tobjects = {",
    "",
    "/* Begin PBXBuildFile section */",
]

for path in app_swift + ext_swift:
    fr, bf = file_ref(path)
    name = os.path.basename(path)
    lines.append(f"\t{bf} /* {name} in Sources */ = {{isa = PBXBuildFile; fileRef = {fr} /* {name} */; }};")

for path in app_resources:
    fr, bf = file_ref(path)
    name = os.path.basename(path)
    lines.append(f"\t{bf} /* {name} in Resources */ = {{isa = PBXBuildFile; fileRef = {fr} /* {name} */; }};")

lines.append(
    f"\t{EMBED_BF} /* PlaybookShareExtension.appex in Embed Foundation Extensions */ = "
    f"{{isa = PBXBuildFile; fileRef = {EXT_PRODUCT} /* PlaybookShareExtension.appex */; "
    f"settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};"
)
lines.append(
    f"\t{SUPABASE_LINK} /* Supabase in Frameworks */ = "
    f"{{isa = PBXBuildFile; productRef = {SUPABASE_PROD} /* Supabase */; }};"
)
lines.append("/* End PBXBuildFile section */")

lines += [
    "",
    "/* Begin PBXCopyFilesBuildPhase section */",
    f"\t{EMBED_PHASE} /* Embed Foundation Extensions */ = {{",
    "\t\tisa = PBXCopyFilesBuildPhase;",
    "\t\tbuildActionMask = 2147483647;",
    "\t\tfiles = (",
    f"\t\t\t{EMBED_BF} /* PlaybookShareExtension.appex in Embed Foundation Extensions */,",
    "\t\t);",
    '\t\tdstPath = "";',
    "\t\tdstSubfolderSpec = 13;",
    '\t\tname = "Embed Foundation Extensions";',
    "\t\trunOnlyForDeploymentPostprocessing = 0;",
    "\t};",
    "/* End PBXCopyFilesBuildPhase section */",
    "",
    "/* Begin PBXFileReference section */",
    f'\t{APP_PRODUCT} /* Playbook.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = Playbook.app; sourceTree = BUILT_PRODUCTS_DIR; }};',
    f'\t{EXT_PRODUCT} /* PlaybookShareExtension.appex */ = {{isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = PlaybookShareExtension.appex; sourceTree = BUILT_PRODUCTS_DIR; }};',
]

all_paths = (
    app_swift
    + ext_swift
    + app_resources
    + [
        "Playbook/Info.plist",
        "Playbook/Playbook.entitlements",
        "PlaybookShareExtension/Info.plist",
        "PlaybookShareExtension/PlaybookShareExtension.entitlements",
    ]
)
for path in all_paths:
    fr, _ = file_ref(path)
    name = os.path.basename(path)
    if path.endswith(".swift"):
        lkf = "sourcecode.swift"
    elif path.endswith(".plist"):
        lkf = "text.plist.xml"
    elif path.endswith(".entitlements"):
        lkf = "text.plist.entitlements"
    else:
        lkf = "folder.assetcatalog"
    lines.append(
        f'\t{fr} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = {lkf}; path = {path}; sourceTree = SOURCE_ROOT; }};'
    )

lines += [
    "/* End PBXFileReference section */",
    "",
    "/* Begin PBXFrameworksBuildPhase section */",
    f"\t{APP_FRAMEWORKS} /* Frameworks */ = {{isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = ({SUPABASE_LINK} /* Supabase in Frameworks */,); runOnlyForDeploymentPostprocessing = 0; }};",
    f"\t{EXT_FRAMEWORKS} /* Frameworks */ = {{isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0; }};",
    "/* End PBXFrameworksBuildPhase section */",
    "",
    "/* Begin PBXGroup section */",
]

ensure_group("Playbook")
ensure_group("PlaybookShareExtension")

for rel_dir in sorted(group_ids.keys(), key=lambda x: (-x.count("/"), x)):
    name = os.path.basename(rel_dir)
    children = group_children(rel_dir)
    gid_val = group_ids[rel_dir]
    lines.append(f"\t{gid_val} /* {name} */ = {{")
    lines.append("\t\tisa = PBXGroup;")
    lines.append("\t\tchildren = (")
    for c in children:
        lines.append(f"\t\t\t{c},")
    lines.append("\t\t);")
    lines.append(f"\t\tname = {name};")
    lines.append('\t\tsourceTree = "<group>";')
    lines.append("\t};")

lines.append(
    f"\t{PRODUCTS_GROUP} /* Products */ = {{isa = PBXGroup; children = ({APP_PRODUCT} /* Playbook.app */, {EXT_PRODUCT} /* PlaybookShareExtension.appex */); name = Products; sourceTree = \"<group>\"; }};"
)
lines.append(
    f"\t{MAIN_GROUP} = {{isa = PBXGroup; children = ({group_ids['Playbook']} /* Playbook */, {group_ids['PlaybookShareExtension']} /* PlaybookShareExtension */, {PRODUCTS_GROUP} /* Products */); sourceTree = \"<group>\"; }};"
)
lines += ["/* End PBXGroup section */"]

lines += [
    "",
    "/* Begin PBXNativeTarget section */",
    f"\t{APP_TARGET} /* Playbook */ = {{",
    "\t\tisa = PBXNativeTarget;",
    f'\t\tbuildConfigurationList = {APP_CONFIG_LIST} /* Build configuration list for PBXNativeTarget "Playbook" */;',
    "\t\tbuildPhases = (",
    f"\t\t\t{BUILD_APP} /* Sources */,",
    f"\t\t\t{APP_FRAMEWORKS} /* Frameworks */,",
    f"\t\t\t{APP_RESOURCES_PHASE} /* Resources */,",
    f"\t\t\t{EMBED_PHASE} /* Embed Foundation Extensions */,",
    "\t\t);",
    "\t\tbuildRules = ();",
    "\t\tdependencies = (",
    f"\t\t\t{APP_DEP} /* PBXTargetDependency */,",
    "\t\t);",
    "\t\tname = Playbook;",
    "\t\tproductName = Playbook;",
    f"\t\tproductReference = {APP_PRODUCT} /* Playbook.app */;",
    '\t\tproductType = "com.apple.product-type.application";',
    "\t};",
    f"\t{EXT_TARGET} /* PlaybookShareExtension */ = {{",
    "\t\tisa = PBXNativeTarget;",
    f'\t\tbuildConfigurationList = {EXT_CONFIG_LIST} /* Build configuration list for PBXNativeTarget "PlaybookShareExtension" */;',
    "\t\tbuildPhases = (",
    f"\t\t\t{BUILD_EXT} /* Sources */,",
    f"\t\t\t{EXT_FRAMEWORKS} /* Frameworks */,",
    f"\t\t\t{EXT_RESOURCES_PHASE} /* Resources */,",
    "\t\t);",
    "\t\tbuildRules = ();",
    "\t\tdependencies = ();",
    "\t\tname = PlaybookShareExtension;",
    "\t\tproductName = PlaybookShareExtension;",
    f"\t\tproductReference = {EXT_PRODUCT} /* PlaybookShareExtension.appex */;",
    '\t\tproductType = "com.apple.product-type.app-extension";',
    "\t};",
    "/* End PBXNativeTarget section */",
    "",
    "/* Begin PBXProject section */",
    f"\t{PROJECT} /* Project object */ = {{",
    "\t\tisa = PBXProject;",
    "\t\tattributes = {",
    "\t\t\tBuildIndependentTargetsInParallel = 1;",
    "\t\t\tLastSwiftUpdateCheck = 1500;",
    "\t\t\tLastUpgradeCheck = 1500;",
    "\t\t};",
    f'\t\tbuildConfigurationList = {PROJECT_CONFIG_LIST} /* Build configuration list for PBXProject "Playbook" */;',
    '\t\tcompatibilityVersion = "Xcode 14.0";',
    "\t\tdevelopmentRegion = en;",
    "\t\thasScannedForEncodings = 0;",
    "\t\tknownRegions = (en, Base,);",
    f"\t\tmainGroup = {MAIN_GROUP};",
    "\t\tpackageReferences = (",
    f'\t\t\t{PACKAGE_REF} /* XCRemoteSwiftPackageReference "supabase-swift" */,',
    "\t\t);",
    f"\t\tproductRefGroup = {PRODUCTS_GROUP} /* Products */;",
    '\t\tprojectDirPath = "";',
    '\t\tprojectRoot = "";',
    "\t\ttargets = (",
    f"\t\t\t{APP_TARGET} /* Playbook */,",
    f"\t\t\t{EXT_TARGET} /* PlaybookShareExtension */,",
    "\t\t);",
    "\t};",
    "/* End PBXProject section */",
    "",
    "/* Begin PBXResourcesBuildPhase section */",
    f"\t{APP_RESOURCES_PHASE} /* Resources */ = {{isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = (",
]
for path in app_resources:
    _, bf = file_ref(path)
    lines.append(f"\t\t\t{bf} /* {os.path.basename(path)} in Resources */,")
lines.append("\t\t); runOnlyForDeploymentPostprocessing = 0; };")
lines.append(
    f"\t{EXT_RESOURCES_PHASE} /* Resources */ = {{isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0; }};"
)
lines.append("/* End PBXResourcesBuildPhase section */")

lines += ["", "/* Begin PBXSourcesBuildPhase section */"]
lines.append(
    f"\t{BUILD_APP} /* Sources */ = {{isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = ("
)
for path in app_swift:
    _, bf = file_ref(path)
    lines.append(f"\t\t\t{bf} /* {os.path.basename(path)} in Sources */,")
lines.append("\t\t); runOnlyForDeploymentPostprocessing = 0; };")
lines.append(
    f"\t{BUILD_EXT} /* Sources */ = {{isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = ("
)
for path in ext_swift:
    _, bf = file_ref(path)
    lines.append(f"\t\t\t{bf} /* {os.path.basename(path)} in Sources */,")
lines.append("\t\t); runOnlyForDeploymentPostprocessing = 0; };")
lines.append("/* End PBXSourcesBuildPhase section */")

lines += [
    "",
    "/* Begin PBXContainerItemProxy section */",
    f"\t{PROXY} /* PBXContainerItemProxy */ = {{isa = PBXContainerItemProxy; containerPortal = {PROJECT} /* Project object */; proxyType = 1; remoteGlobalIDString = {EXT_TARGET}; remoteInfo = PlaybookShareExtension; }};",
    "/* End PBXContainerItemProxy section */",
    "",
    "/* Begin PBXTargetDependency section */",
    f"\t{APP_DEP} /* PBXTargetDependency */ = {{isa = PBXTargetDependency; target = {EXT_TARGET} /* PlaybookShareExtension */; targetProxy = {PROXY} /* PBXContainerItemProxy */; }};",
    "/* End PBXTargetDependency section */",
]

app_settings = """\
\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\tDEVELOPMENT_TEAM = YOUR_TEAM_ID;
\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\tINFOPLIST_FILE = Playbook/Info.plist;
\t\t\tINFOPLIST_KEY_CFBundleDisplayName = "Playbook AI";
\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\tLD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
\t\t\tMARKETING_VERSION = 1.0;
\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.playbook.app;
\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
\t\t\tSWIFT_VERSION = 5.0;
\t\t\tTARGETED_DEVICE_FAMILY = 1;"""

ext_settings = """\
\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\tDEVELOPMENT_TEAM = YOUR_TEAM_ID;
\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\tINFOPLIST_FILE = PlaybookShareExtension/Info.plist;
\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\tLD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks";
\t\t\tMARKETING_VERSION = 1.0;
\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.playbook.app.share;
\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\tSKIP_INSTALL = YES;
\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
\t\t\tSWIFT_VERSION = 5.0;
\t\t\tTARGETED_DEVICE_FAMILY = 1;"""

project_debug = """\
\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;
\t\t\tENABLE_TESTABILITY = YES;
\t\t\tGCC_OPTIMIZATION_LEVEL = 0;
\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\tONLY_ACTIVE_ARCH = YES;
\t\t\tSDKROOT = iphoneos;
\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";"""

project_release = """\
\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
\t\t\tENABLE_NS_ASSERTIONS = NO;
\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\tSDKROOT = iphoneos;
\t\t\tSWIFT_COMPILATION_MODE = wholemodule;
\t\t\tVALIDATE_PRODUCT = YES;"""

lines += [
    "",
    "/* Begin XCBuildConfiguration section */",
    f"\t{DEBUG_CONFIG} /* Debug */ = {{isa = XCBuildConfiguration; buildSettings = {{{project_debug}\n\t\t}}; name = Debug; }};",
    f"\t{RELEASE_CONFIG} /* Release */ = {{isa = XCBuildConfiguration; buildSettings = {{{project_release}\n\t\t}}; name = Release; }};",
    f"\t{APP_DEBUG} /* Debug */ = {{isa = XCBuildConfiguration; buildSettings = {{{app_settings}\n\t\t\tCODE_SIGN_ENTITLEMENTS = Playbook/Playbook.entitlements;\n\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = \"DEBUG $(inherited)\";\n\t\t}}; name = Debug; }};",
    f"\t{APP_RELEASE} /* Release */ = {{isa = XCBuildConfiguration; buildSettings = {{{app_settings}\n\t\t\tCODE_SIGN_ENTITLEMENTS = Playbook/Playbook.entitlements;\n\t\t}}; name = Release; }};",
    f"\t{EXT_DEBUG} /* Debug */ = {{isa = XCBuildConfiguration; buildSettings = {{{ext_settings}\n\t\t\tCODE_SIGN_ENTITLEMENTS = PlaybookShareExtension/PlaybookShareExtension.entitlements;\n\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = \"DEBUG $(inherited)\";\n\t\t}}; name = Debug; }};",
    f"\t{EXT_RELEASE} /* Release */ = {{isa = XCBuildConfiguration; buildSettings = {{{ext_settings}\n\t\t\tCODE_SIGN_ENTITLEMENTS = PlaybookShareExtension/PlaybookShareExtension.entitlements;\n\t\t}}; name = Release; }};",
    "/* End XCBuildConfiguration section */",
    "",
    "/* Begin XCConfigurationList section */",
    f'\t{PROJECT_CONFIG_LIST} /* Build configuration list for PBXProject "Playbook" */ = {{isa = XCConfigurationList; buildConfigurations = ({DEBUG_CONFIG} /* Debug */, {RELEASE_CONFIG} /* Release */); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; }};',
    f'\t{APP_CONFIG_LIST} /* Build configuration list for PBXNativeTarget "Playbook" */ = {{isa = XCConfigurationList; buildConfigurations = ({APP_DEBUG} /* Debug */, {APP_RELEASE} /* Release */); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; }};',
    f'\t{EXT_CONFIG_LIST} /* Build configuration list for PBXNativeTarget "PlaybookShareExtension" */ = {{isa = XCConfigurationList; buildConfigurations = ({EXT_DEBUG} /* Debug */, {EXT_RELEASE} /* Release */); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; }};',
    "/* End XCConfigurationList section */",
    "",
    "/* Begin XCRemoteSwiftPackageReference section */",
    f'\t{PACKAGE_REF} /* XCRemoteSwiftPackageReference "supabase-swift" */ = {{isa = XCRemoteSwiftPackageReference; repositoryURL = "https://github.com/supabase/supabase-swift"; requirement = {{kind = upToNextMajorVersion; minimumVersion = 2.0.0;}};}};',
    "/* End XCRemoteSwiftPackageReference section */",
    "",
    "/* Begin XCSwiftPackageProductDependency section */",
    f'\t{SUPABASE_PROD} /* Supabase */ = {{isa = XCSwiftPackageProductDependency; package = {PACKAGE_REF} /* XCRemoteSwiftPackageReference "supabase-swift" */; productName = Supabase;}};',
    "/* End XCSwiftPackageProductDependency section */",
    "",
    "\t};",
    f"\trootObject = {PROJECT} /* Project object */;",
    "}",
]

out_dir = os.path.join(ROOT, "Playbook.xcodeproj")
os.makedirs(out_dir, exist_ok=True)
pbxproj = os.path.join(out_dir, "project.pbxproj")
with open(pbxproj, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

scheme_dir = os.path.join(out_dir, "xcshareddata", "xcschemes")
os.makedirs(scheme_dir, exist_ok=True)
scheme_path = os.path.join(scheme_dir, "Playbook.xcscheme")
with open(scheme_path, "w", encoding="utf-8") as f:
    f.write(f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1500" version="1.7">
   <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES">
      <BuildActionEntries>
         <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">
            <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{APP_TARGET}" BuildableName="Playbook.app" BlueprintName="Playbook" ReferencedContainer="container:Playbook.xcodeproj"/>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES">
      <BuildableProductRunnable runnableDebuggingMode="0">
         <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{APP_TARGET}" BuildableName="Playbook.app" BlueprintName="Playbook" ReferencedContainer="container:Playbook.xcodeproj"/>
      </BuildableProductRunnable>
   </LaunchAction>
</Scheme>
""")

print(f"Wrote {pbxproj}")
print(f"Wrote {scheme_path}")
print(f"App Swift files: {len(app_swift)}")
print(f"Extension Swift files: {len(ext_swift)}")
