# Targets are placeholders until backend/ and frontend/ have a real stack.
# Mirrors the structure of the group's other NUS project (is4228): a thin
# Makefile wrapping whatever install/dev/build commands the chosen stack needs.
# Windows users: use start.ps1 instead.

.PHONY: install dev build backend frontend seed

install:
	@echo "TODO: install backend + frontend dependencies once a stack is chosen"

seed:
	@echo "TODO: load/generate mock account, incentive and alert data for the demo"

backend:
	@echo "TODO: start the backend service (implements M1-M7, see docs/)"

frontend:
	@echo "TODO: start the frontend dashboard"

dev:
	./start.sh

build:
	@echo "TODO: build frontend for production / prep for deploy/"
