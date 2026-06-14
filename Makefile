.PHONY: install build dev test clean

install:
	npm install

build:
	npm run build:shared

dev:
	npm run dev:server

test:
	python test-api.py

clean:
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules

lint:
	npx tsc --noEmit
