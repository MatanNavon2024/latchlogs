#!/usr/bin/env ruby
require 'xcodeproj'
require 'fileutils'

ROOT = File.expand_path('..', __dir__)
PROJECT_PATH = File.join(ROOT, 'ios', 'LatchLog.xcodeproj')
CLIP_SRC = File.join(ROOT, 'app-clip')
CLIP_DST = File.join(ROOT, 'ios', 'LatchLogClip')
TEAM_ID = '9R25HDJZU6'

project = Xcodeproj::Project.open(PROJECT_PATH)

if project.targets.any? { |t| t.name == 'LatchLogClip' }
  puts "LatchLogClip target already exists, skipping."
  exit 0
end

puts "Adding LatchLogClip target..."

# Copy source files to ios/LatchLogClip
FileUtils.rm_rf(CLIP_DST)
FileUtils.mkdir_p(CLIP_DST)
FileUtils.cp_r(Dir.glob(File.join(CLIP_SRC, '*')), CLIP_DST)

# Find main app target
main_target = project.targets.find { |t| t.name == 'LatchLog' }
abort("Main target 'LatchLog' not found") unless main_target

# Create App Clip target
clip_target = project.new_target(
  :application,
  'LatchLogClip',
  :ios,
  '16.0'
)

# Set product type to App Clip
clip_target.product_type = 'com.apple.product-type.application.on-demand-install-capable'

# Add source group
clip_group = project.main_group.new_group('LatchLogClip', 'LatchLogClip')

# Add Swift source files
swift_files = Dir.glob(File.join(CLIP_DST, '*.swift'))
swift_files.each do |f|
  ref = clip_group.new_file(File.basename(f))
  clip_target.source_build_phase.add_file_reference(ref)
end

# Add Assets.xcassets
assets_ref = clip_group.new_file('Assets.xcassets')
clip_target.resources_build_phase.add_file_reference(assets_ref)

# Add Info.plist (don't add to build phase, just reference)
clip_group.new_file('Info.plist')

# Add entitlements (don't add to build phase)
clip_group.new_file('LatchLogClip.entitlements')

# Configure build settings for both Debug and Release
clip_target.build_configurations.each do |config|
  config.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.matannavon.latchlog.Clip',
    'INFOPLIST_FILE' => 'LatchLogClip/Info.plist',
    'CODE_SIGN_ENTITLEMENTS' => 'LatchLogClip/LatchLogClip.entitlements',
    'CODE_SIGN_STYLE' => 'Automatic',
    'DEVELOPMENT_TEAM' => TEAM_ID,
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
    'ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME' => 'AccentColor',
    'GENERATE_INFOPLIST_FILE' => 'NO',
    'CURRENT_PROJECT_VERSION' => '1',
    'MARKETING_VERSION' => '1.0.0',
    'IPHONEOS_DEPLOYMENT_TARGET' => '16.0',
    'CLANG_ENABLE_MODULES' => 'YES',
    'LD_RUNPATH_SEARCH_PATHS' => '$(inherited) @executable_path/Frameworks',
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'SUPPORTS_MACCATALYST' => 'NO',
  })
end

# Embed App Clip in main app
embed_phase = main_target.new_copy_files_build_phase('Embed App Clips')
embed_phase.dst_subfolder_spec = '16'
embed_phase.dst_path = '$(CONTENTS_FOLDER_PATH)/AppClips'
embed_phase.add_file_reference(clip_target.product_reference)

# Add dependency: main app depends on App Clip
main_target.add_dependency(clip_target)

# Add associated App Clip identifier + associated domains to main app entitlements
main_entitlements = File.join(ROOT, 'ios', 'LatchLog', 'LatchLog.entitlements')
if File.exist?(main_entitlements)
  system("/usr/libexec/PlistBuddy -c \"Delete :com.apple.developer.associated-appclip-app-identifiers\" \"#{main_entitlements}\" 2>/dev/null")
  system("/usr/libexec/PlistBuddy -c \"Add :com.apple.developer.associated-appclip-app-identifiers array\" \"#{main_entitlements}\"")
  system("/usr/libexec/PlistBuddy -c \"Add :com.apple.developer.associated-appclip-app-identifiers:0 string '\\$(AppIdentifierPrefix)com.matannavon.latchlog.Clip'\" \"#{main_entitlements}\"")

  system("/usr/libexec/PlistBuddy -c \"Delete :com.apple.developer.associated-domains\" \"#{main_entitlements}\" 2>/dev/null")
  system("/usr/libexec/PlistBuddy -c \"Add :com.apple.developer.associated-domains array\" \"#{main_entitlements}\"")
  system("/usr/libexec/PlistBuddy -c \"Add :com.apple.developer.associated-domains:0 string 'applinks:latchlogs.com'\" \"#{main_entitlements}\"")
  system("/usr/libexec/PlistBuddy -c \"Add :com.apple.developer.associated-domains:1 string 'appclips:latchlogs.com'\" \"#{main_entitlements}\"")
end

# Add associated domains to App Clip entitlements
clip_entitlements = File.join(CLIP_DST, 'LatchLogClip.entitlements')
if File.exist?(clip_entitlements)
  system("/usr/libexec/PlistBuddy -c \"Delete :com.apple.developer.associated-domains\" \"#{clip_entitlements}\" 2>/dev/null")
  system("/usr/libexec/PlistBuddy -c \"Add :com.apple.developer.associated-domains array\" \"#{clip_entitlements}\"")
  system("/usr/libexec/PlistBuddy -c \"Add :com.apple.developer.associated-domains:0 string 'appclips:latchlogs.com'\" \"#{clip_entitlements}\"")
end

project.save
puts "LatchLogClip target added successfully!"
