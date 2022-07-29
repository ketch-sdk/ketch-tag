// jest.setup.js
import { Crypto } from "@peculiar/webcrypto";

global.crypto = new Crypto();
