#! /usr/bin/env bash

# You need compare-locales installed to run this script
# https://developer.mozilla.org/en/docs/Compare-locales

echo > l10n_results.txt
for folder in $(find extension/locale -type d -mindepth 1 -maxdepth 1)
do
	echo "Checking $folder"
	echo -e $(basename $folder) >> l10n_results.txt
	compare-dirs extension/locale/en-US $folder >> l10n_results.txt
	echo >> l10n_results.txt
done
