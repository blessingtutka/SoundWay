import os

IGNORED_FOLDERS = {'.git', '.venv', '__pycache__', '.idea', '.mypy_cache'}

def write_tree(dir_path, file, indent=""):
    """This function writes the directory tree structure to a given file.
    Parameter:
    ----------
    dir_path (str): The root directory path to start the tree from.
    file (file object): The file object to which the structure will be written.
    indent (str): The current indentation level used for subdirectories.
    Return:
    -------
    None
    Version:
    --------
    specification: Esteban Barracho (v.1 09/11/25)
    implement: Esteban Barracho (v.1 09/11/25)
    """

    for item in sorted(os.listdir(dir_path)):
        if item in IGNORED_FOLDERS:
            continue
        path = os.path.join(dir_path, item)
        if os.path.isdir(path):
            file.write(f"{indent}{item}/\n")
            write_tree(path, file, indent + "    ")
        else:
            file.write(f"{indent}{item}\n")

def generate_structure(output_file="../../structure.txt"):
    """This function generates the project structure file named 'structure.txt'.
    Parameter:
    ----------
    output_file (str): The output file name. Default is 'structure.txt'.
    Return:
    -------
    None
    Version:
    --------
    specification: Esteban Barracho (v.1 09/11/25)
    implement: Esteban Barracho (v.1 09/11/25)
    """

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("Structure du projet :\n\n")
        write_tree(".", f)

if __name__ == "__main__":
    generate_structure()