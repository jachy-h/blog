---
title: "Go 使用 grpc"
date: 2022-08-12T11:15:14+08:00
categories: ["golang", "General"]
draft: false
---

### 快速开始

1. 安装 `protoc-gen-go` 和 `protoc-gen-go-grpc` 插件

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

确认插件已安装：

```bash
protoc-gen-go-grpc --version
protoc-gen-go-grpc 1.1.0
```

2. 编写 proto 文件

```proto
syntax = "proto3";

package hw;

option go_package="./hello"; // 告诉protoc生成的文件的包名

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string name = 1;
}

```

3. 生成代码

```bash
protoc -I=. --go_out=./grpc/service --go-grpc_out=./grpc/service ./grpc/service/hello/helloworld.proto
```

说明：
- `go_out`：生成后的 `*.pb.go` 文件位置
- `go-grpc_out`：生成后的 `*_grpc.pb.go` 文件位置
- `-I`：即 `-IPATH` 或 `--proto_path=PATH`，指定搜索路径，表示在哪个路径下搜索 `.proto` 文件