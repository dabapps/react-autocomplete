#!/bin/sh -e

mkdir -p examples/__build__
watchify examples/async-data/app.js -t babelify -v -o examples/__build__/async-data.js
