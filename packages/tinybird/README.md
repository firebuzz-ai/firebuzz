# @firebuzz/tinybird

This package contains Tinybird datasources, pipes, and other resources.

## Setup

The Tinybird CLI is a Python package. It's recommended to use a Python virtual environment to manage dependencies for this package.

1.  **Create and activate a virtual environment:**

    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```

2.  **Install Python dependencies:**

    A `requirements.txt` is provided for convenience.

    ```bash
    pip install -r requirements.txt
    ```

3.  **Authenticate with Tinybird:**

    Once the `tinybird-cli` is installed, you need to authenticate.

    ```bash
    tb auth
    ```

Now you can use the `tb` command to interact with your Tinybird projects. The scripts in `package.json` of this package will use the `tb` command from your activated virtual environment.
