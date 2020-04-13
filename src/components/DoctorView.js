import React, { Component } from "react";
import EthCrypto from "eth-crypto";
//Required module(s)
const ipfsAPI = require("ipfs-api");
//Connceting to the ipfs network via infura gateway
const ipfs = ipfsAPI("ipfs.infura.io", "5001", { protocol: "https" });
// Including all Crpyto-JS libraries
const CryptoJS = require("crypto-js");

export class DoctorView extends Component {
  state = {
    patientFileHashes: []
  };

  RetrieveFileFromIPFS = async (
    encryptedPassphrase_,
    encrpytedFileHash,
    doctorPrivateKey
  ) => {
    // Decrpyting the patient's passphrase using the doctor's private key
    const originalPassphrase = await EthCrypto.decryptWithPrivateKey(
      doctorPrivateKey, // the private key of the doctor
      encryptedPassphrase_ // the encrypted passphrase of the patient
    );
    console.log("The original passphrase of the patient: ", originalPassphrase);

    // Getting the uploaded encrpyted file via hash code
    ipfs.files.cat(encrpytedFileHash, function(err, bufferedCiphertext) {
      console.log("Getting the encrpyted file from IPFS ....... ");
      console.log("Buffered ciphertext: ", bufferedCiphertext);
      const ciphertext = bufferedCiphertext.toString();
      console.log("Ciphertext :", ciphertext);
      // Decrypt the file using the patient's passphrase/secret key
      const bytes = CryptoJS.AES.decrypt(ciphertext, originalPassphrase);
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
  }; // End of the RetrieveFileFromIPFS functon

  RetrieveDoctorPrivateKeyFromIPFS = async (
    encryptedPassphrase_,
    encrpytedFileHash
  ) => {
    // Getting the doctor's private key from IPFS via hash code
    const that = this; // NECESSARY
    ipfs.files.cat(this.props.encrpytedPrivateKeyHash, function(
      err,
      bufferedEncrpytedPrivateKey
    ) {
      console.log(
        "Buffered encrpyted private key: ",
        bufferedEncrpytedPrivateKey
      );
      const encrpytedPrivateKey = bufferedEncrpytedPrivateKey.toString();
      console.log("Encrpyted private key:", encrpytedPrivateKey);
      console.log("that.props.userPassphrase :", that.props.userPassphrase);
      // Decrypting the encrpyted private key using the doctor's passphrase
      const bytes = CryptoJS.AES.decrypt(
        encrpytedPrivateKey,
        that.props.userPassphrase
      );
      console.log("bytes.....", bytes);
      const doctorPrivateKey = bytes.toString(CryptoJS.enc.Utf8);
      console.log("Doctor private key(1): ", doctorPrivateKey); // 'private key'
      that.RetrieveFileFromIPFS(
        encryptedPassphrase_,
        encrpytedFileHash,
        doctorPrivateKey
      );
    });
  }; // End of the RetrieveDoctorPrivateKey functon

  onClick = async event => {
    event.preventDefault();
    console.log("Button clicked......");
    const patientAddress = event.target.value;
    console.log("This file belongs to this patient: ", patientAddress);
    const encrpytedFileHash = event.target.name;
    this.props.doctorListOfPatientsEncryptedPassphrases.map(
      (EncryptedPassphrase, key) => {
        if (EncryptedPassphrase.patientAddress === patientAddress) {
          console.log(" Hi Canada !");
          const encryptedPassphrase_ = {
            iv: EncryptedPassphrase.iv,
            ephemPublicKey: EncryptedPassphrase.ephemPublicKey,
            ciphertext: EncryptedPassphrase.ciphertext,
            mac: EncryptedPassphrase.mac
          };
          this.RetrieveDoctorPrivateKeyFromIPFS(
            encryptedPassphrase_,
            encrpytedFileHash
          );
        } // End of if statement
      }
    ); // End of for loop
  }; // end of onClick event handler

  render() {
    return (
      <div className="container-fluid mt-5">
        <div className="row">
          <main>
            <div>
              <p> Hi there! I am a doctor </p>
            </div>

            <div>
              {this.props.fileHashesDoctorView.map(
                (fileHashDoctorView, key) => {
                  return (
                    <div>
                      <div>
                        <h5>{fileHashDoctorView.patientAddress}</h5>
                        <p>Medical Files- View: </p>
                        {fileHashDoctorView.hashList.map((hash, key) => {
                          return (
                            <div>
                              <p>
                                {" "}
                                Medical File{" "}
                                <button
                                  name={hash}
                                  value={fileHashDoctorView.patientAddress}
                                  onClick={this.onClick}
                                >
                                  View File
                                </button>{" "}
                              </p>
                            </div>
                          );
                        })}
                        <hr></hr>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }
}

export default DoctorView;
