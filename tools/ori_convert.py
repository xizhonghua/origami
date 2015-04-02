#!/usr/bin/env python
# This script is use to convert ori/traj file types to json
# Author: Zhonghua Xi 4/2/2015

import sys
import os


def convert_ori_to_json(input, output):
    pass

def convert_traj_to_json(input, output):
    pass


def main():
    if len(sys.argv) < 2:
        print sys.argv[0], '*.ori / *.traj'
    else:
        filename = sys.argv[1]
        if filename.endswith('.ori'):
            convert_ori_to_json(filename, filename+'.json')
        elif filename.endswith('.traj'):
            convert_traj_to_json(filename, filename+'.json')
        else:
            print 'unknown file type', filename

if __name__ == '__main__':
    main()