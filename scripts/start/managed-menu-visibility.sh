#!/bin/sh -e

mkdir -p examples/__build__
watchify examples/managed-menu-visibility/app.js -t babelify -v -o examples/__build__/managed-menu-visibility.js
