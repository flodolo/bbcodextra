#! /usr/bin/env python

'''
This script reads settings from l10n.ini. It analyzes all locales and add to
manifest.template all complete locales.
'''

from ConfigParser import SafeConfigParser
import glob
import json
import os
import sys

try:
    import silme.core
    import silme.io
    import silme.format
    silme.format.Manager.register('dtd', 'properties')
except ImportError:
    print 'Error importing Silme library'
    sys.exit(1)


def list_diff(a, b):
    ''' Return list of elements of list a not available in list b '''

    b = set(b)
    return [aa for aa in a if aa not in b]


def main():
    # Get absolute path of the current script location
    script_folder = os.path.abspath(os.path.dirname(__file__))

    parser = SafeConfigParser()
    parser.readfp(open(os.path.join(script_folder, 'l10n.ini')))

    # All paths in l10n.ini are relative to the file itself
    locale_path = os.path.abspath(os.path.join(script_folder, parser.get('config', 'locale_path')))
    reference_locale = parser.get('config', 'reference_locale')

    # Create a list of reference (en-US) files
    reference_files = []
    reference_path = os.path.join(locale_path, reference_locale)
    for path, subdirs, files in os.walk(reference_path):
        for name in files:
            if os.path.isfile(os.path.join(path, name)) and not name.startswith('.'):
                reference_files.append(os.path.join(path, name))

    # Create a list of reference files, and store reference data only once.
    # Object has the following structure:
    #
    # {
    #     'filename1': {
    #         'entity1': 'value1',
    #         ...
    #     },
    #     ...
    # }
    ioclient = silme.io.Manager.get('file')
    reference_strings = {}
    for reference_file in reference_files:
        reference_entities = ioclient.get_entitylist(reference_file)
        file_index = os.path.relpath(reference_file, reference_path)
        reference_strings[file_index] = {}
        for entity in reference_entities:
            reference_strings[file_index][entity] = reference_entities[entity].get_value()


    # Get a list of all locales/folders in locale_path
    locales = []
    for locale in sorted(os.listdir(locale_path)):
        if os.path.isdir(os.path.join(locale_path, locale)) and not locale.startswith('.') and locale != reference_locale:
            locales.append(locale)

    # Analyze locales
    complete_locales = []
    for locale in locales:
        missing_strings = []
        errors = []
        for reference_file in reference_files:
            file_index = os.path.relpath(reference_file, reference_path)
            try:
                locale_file = reference_file.replace(
                    '/{0}/'.format(reference_locale),
                    '/{0}/'.format(locale)
                )
                locale_strings = {}
                if os.path.isfile(locale_file):
                    # Locale file exists, store existing translations
                    locale_entities = ioclient.get_entitylist(locale_file)
                    for entity in locale_entities:
                        locale_strings[entity] = locale_entities[entity].get_value()
            except Exception as e:
                errors.append(str(e))
            file_missing_strings = list_diff(reference_strings[file_index], locale_strings)
            if len(file_missing_strings) > 0:
                for string_id in file_missing_strings:
                    missing_strings.append('{0}:{1}'.format(file_index, string_id))

        if len(missing_strings) == 0:
            complete_locales.append(locale)
        else:
            print '----\nLocale {0} is incomplete. Missing strings:'.format(locale)
            print '\n'.join(missing_strings)
            print '----\n'

    print 'Complete locales'
    print '\n'.join(complete_locales)

if __name__ == '__main__':
    main()
