import React, { Component } from "react";
import EthCrypto from "eth-crypto";

//Required module(s)
const ipfsAPI = require("ipfs-api");
// Connceting to the ipfs network via infura gateway
const ipfs = ipfsAPI("ipfs.infura.io", "5001", { protocol: "https" });
// Including all Crpyto-JS libraries
const CryptoJS = require("crypto-js");

export class Main extends Component {
  captureFile = event => {
    event.preventDefault();
    // Fetch the selected file
    const file = event.target.files[0];
    console.log("file ......: ", file);

    if (file !== undefined) {
      //Convert the file to a buffer
      const reader = new window.FileReader();
      reader.readAsArrayBuffer(file);
      reader.onloadend = () => {
        this.props.setBuffer(Buffer(reader.result));
      };
    }
  }; // End of captureFile event handler

  onSubmit = event => {
    event.preventDefault();

    if (this.props.buffer === null) {
      // Here we know that a file has not been selected
      alert(" Please select a medical file to upload");
    } else {
      // Here we know that a file has been selected
      console.log("The Unit8Array content of the file", this.props.buffer);

      // Encrypting the file using the patient's passphrase. The passphrase is the secret key
      const ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify(this.props.buffer),
        this.props.userPassphrase
      ).toString();
      console.log("Ciphertext: ", ciphertext);
      console.log("Buffered ciphertext: ", Buffer(ciphertext));

      // Adding the encrpyted file to IPFS
      ipfs.files.add(Buffer(ciphertext), (error, result) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log("File added succesfully");
        console.log("IPFS result", result);

        // Storing the file hash returned from IPFS on the blockchain
        this.props.storeFileHash(result[0].hash);
      });
    } // End of if statement
  }; // End of onSubmit event handler
  onClick = event => {
    event.preventDefault();
    console.log("Button clicked......");

    /*** Getting the uploaded encrpyted file via hash code ***/
    const that = this; // NECESSARY
    ipfs.files.cat(event.target.name, function(err, bufferedCiphertext) {
      console.log("Getting the encrpyted file from IPFS ....... ");
      console.log("Buffered ciphertext: ", bufferedCiphertext);

      const ciphertextFromBuffer = bufferedCiphertext.toString();
      console.log("Ciphertext From Buffer:", ciphertextFromBuffer);

      // Decrypting the file using the patient's passphrase
      const bytes = CryptoJS.AES.decrypt(
        ciphertextFromBuffer,
        that.props.userPassphrase
      );
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      const file = new Uint8Array(decryptedData.data); // file is a Unit8Array that can be passed to a blob object to disaply the file
      console.log("The Unit8Array content of the file: ", file); //  this.prpos.buffer

      /*
      //Below is the piece of code to view the file (1 pption only: View)
      const blob = new Blob([file], { type: "application/pdf" });
      const blobURL = URL.createObjectURL(blob);
      window.open(blobURL);
      */

      // Below is the piece of  code to view or download the file (2 options : view or download)
      const blob = new Blob([file], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = "Medical File";
      link.click();
    });
  }; // end of onClick event handler

  render() {
    return (
      <div className="container-fluid mt-5">
        <div className="row">
          <main>
            <div>
              <h5>Grant a doctor an access to your medical files</h5>
              <form
                onSubmit={async event => {
                  event.preventDefault();
                  const doctorAddress = this.doctorAddress.value;
                  const doctorPublicKey = this.doctorPublicKey.value;
                  // Encrpyting the passphrase of the patient using the doctor's public key
                  const encryptedPassphrase = await EthCrypto.encryptWithPublicKey(
                    doctorPublicKey, // publicKey
                    this.props.userPassphrase // passphrase to be encrpyted
                  );
                  console.log(
                    " The encrtpyed passphrase using the doctor's public key: ",
                    encryptedPassphrase
                  );

                  await this.props.grantAccessToDoctor(
                    doctorAddress,
                    encryptedPassphrase
                  );
                }}
              >
                <div className="form-group mr-sm-2">
                  <input
                    id="doctorAddress"
                    type="text"
                    ref={input => {
                      this.doctorAddress = input;
                    }}
                    className="form-control"
                    placeholder="Please enter a doctor address"
                    required
                  />
                </div>
                <div className="form-group mr-sm-2">
                  <input
                    id="doctorPublicKey"
                    type="text"
                    ref={input => {
                      this.doctorPublicKey = input;
                    }}
                    className="form-control"
                    placeholder="Please enter the doctor's public key "
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  {" "}
                  Grant access
                </button>
              </form>
            </div>

            <hr></hr>

            <div>
              <h5>List of doctors with access to your medical files: </h5>
              <ul>
                {this.props.doctorAddresses.map((doctorAddress, key) => {
                  return (
                    <div>
                      <li>
                        {doctorAddress}{" "}
                        <button
                          name={doctorAddress}
                          onClick={async event => {
                            await this.props.revokeAccessFromDoctor(
                              event.target.name
                            );
                          }}
                        >
                          Revoke access
                        </button>{" "}
                      </li>
                    </div>
                  );
                })}
              </ul>
            </div>

            <hr></hr>

            <div>
              <h5>Medical Files-Upload: </h5>
              <form onSubmit={this.onSubmit}>
                <div>
                  <label className="mr-2">Upload your medical document:</label>
                  <input type="file" onChange={this.captureFile} />
                  <input type="submit" value="Submit" />
                </div>
              </form>
            </div>

            <hr></hr>

            <div>
              <h5>Medical Files-View: </h5>
              {this.props.fileHashes.map((fileHash, key) => {
                return (
                  <div>
                    <p>
                      {" "}
                      Medical File{" "}
                      <button name={fileHash} onClick={this.onClick}>
                        View File
                      </button>{" "}
                    </p>
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    );
  }
}

export default Main;
