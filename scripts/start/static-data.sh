#!/bin/sh -e

mkdir -p examples/__build__
watchify examples/static-data/app.js -t babelify -v -o examples/__build__/static-data.js
