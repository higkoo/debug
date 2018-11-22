# 加载bazel标准库中的函数 http_archive
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
# 调用http_archive下载rules_go
http_archive(
    name = "io_bazel_rules_go",
    url = "http://bazel-cabin.bilibili.co/go/rules_go/rules_go-0.16.2_hack.tar.gz",
    sha256 = "3620515d556606822c9f26a6ff0bb095e3f4a2a31c6bbc17c8dc24f13d9dae5d",
)

http_archive(
    name = "bazel_gazelle",
    urls = ["http://bazel-cabin.bilibili.co/go/gazelle/bazel-gazelle-0.15.0.tar.gz"],
    sha256 = "6e875ab4b6bf64a38c352887760f21203ab054676d9c1b274963907e0768740d",
)

load("@io_bazel_rules_go//go:def.bzl", "go_download_sdk")
go_download_sdk(
    name = "go_sdk",
    urls = ["http://bazel-cabin.bilibili.co/go/{}"],
    sdks = {
        "linux_amd64":   ("go1.10.5.linux-amd64.tar.gz",
	        "a035d9beda8341b645d3f45a1b620cf2d8fb0c5eb409be36b389c0fd384ecc3a"),
        "darwin_amd64":  ("go1.10.5.darwin-amd64.tar.gz",
            "36873d9935f7f3519da11c9e928b66c94ccbf71c37df71b7635e804a226ae631"),
        "windows_amd64": ("go1.10.5.windows-amd64.zip",
            "d88a32eb4d1fc3b11253c9daa2ef397c8700f3ba493b41324b152e6cda44d2b4"),
    },
)


# 从rules_go中加载go_rules_dependencies,go_register_toolchains
load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")
# 加载rules_go依赖
go_rules_dependencies()
# 加载rules_go工具
go_register_toolchains()
# 从gazelle中加载gazelle_dependencies
load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")
# 加载gazelle依赖
gazelle_dependencies()
