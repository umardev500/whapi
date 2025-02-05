# Define paths
PROTO_DIR = proto
OUT_DIR = src/generated
PROTOC_GEN_GRPC=$(shell pwd)/node_modules/.bin/grpc_tools_node_protoc_plugin
PROTOC_GEN_TS=$(shell pwd)/node_modules/.bin/protoc-gen-ts
PROTOC = ./node_modules/.bin/grpc_tools_node_protoc

# Ensure output directory exists
$(OUT_DIR):
	mkdir -p $(OUT_DIR)

# Generate gRPC and TypeScript files from .proto
generate: $(OUT_DIR)
	$(PROTOC) \
		--proto_path=$(PROTO_DIR) \
		--plugin=protoc-gen-grpc=$(PROTOC_GEN_GRPC) \
		--plugin=protoc-gen-ts=$(PROTOC_GEN_TS) \
		--js_out=import_style=commonjs,binary:$(OUT_DIR) \
		--grpc_out=grpc_js:$(OUT_DIR) \
		--ts_out=grpc_js:$(OUT_DIR) \
		$(PROTO_DIR)/*.proto

# Clean generated files
clean:
	rm -rf $(OUT_DIR)

# Default target
all: generate
