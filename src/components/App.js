import React, { Component } from "react";
import Web3 from "web3";
import "./App.css";
import Meme from "../abis/Meme";
import Addressbar from "./Addressbar";
import Main from "./Main";
import DoctorView from "./DoctorView";
import Registration from "./Registration";
// Including all Crpyto-JS libraries
const CryptoJS = require("crypto-js");
class App extends Component {
  async componentDidMount() {
    await this.getWeb3Provider();
    this.loadBlockchainData();
  }

  async getWeb3Provider() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider);
    } else {
      window.alert(
        "Non-Ethereum browser detected. You should consider trying MetaMask!"
      );
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3;
    // Load the account
    const accounts = await web3.eth.getAccounts();
    console.log("Loading blockchain data");
    console.log(accounts);
    this.setState({ account: accounts[0] });
    //Get an instance of the deployed smart contract in Javascript to allow us to call the functions of the smart contract
    const networkId = await web3.eth.net.getId();
    const networkData = Meme.networks[networkId];
    if (networkData) {
      const contract = new web3.eth.Contract(Meme.abi, networkData.address);
      this.setState({ contract: contract });

      // Fetching the hash of the user's encrpyted private key from the blockchain:
      const encrpytedPrivateKeyHash = await contract.methods
        .getEncryptedPrivateKeyHash(this.state.account)
        .call();
      console.log("Encrpyted private key hash: ", encrpytedPrivateKeyHash);
      this.setState({ encrpytedPrivateKeyHash: encrpytedPrivateKeyHash });

      // Setting the passphrase for the user (i.e. patient or doctor)
      console.log("account address: ", this.state.account);
      const userPassphrase = CryptoJS.SHA512(this.state.account).toString();
      this.setState({ userPassphrase: userPassphrase });
      console.log(
        "Passharse to be used for the user's secret key: ",
        this.state.userPassphrase
      );

      // Fetching all the encrypted passphrases of the patients who have given medical file access to THIS doctor
      const encryptedPassphrasesCount = await contract.methods
        .getEnrpytedPassphrasesCount(this.state.account)
        .call();
      console.log("Count", encryptedPassphrasesCount);
      const encryptedPassphrases = await contract.methods
        .getListOfEnrpytedPassphrases(this.state.account)
        .call(); // does not return an array of strcuts, as we expected. it returns an array of arrays.
      console.log("List of Encrypted Passphrases", encryptedPassphrases);

      /*  NOTE: Soldity does not return an array of structs, as we expected. Soldity actually returns an "array of arrays".
        To find some workaround to fix the issue, we need to create an object named "encryptedPassphrase" and assign specific
         values from the returned array of arrays to the elements  of the object,  as shown below:
      */
      for (var i = 0; i < encryptedPassphrasesCount; i++) {
        const encryptedPassphrase = {
          patientAddress: encryptedPassphrases[i][0],
          iv: encryptedPassphrases[i][1],
          ephemPublicKey: encryptedPassphrases[i][2],
          ciphertext: encryptedPassphrases[i][3],
          mac: encryptedPassphrases[i][4]
        };

        console.log("Object...... ", encryptedPassphrase);

        this.setState({
          doctorListOfPatientsEncryptedPassphrases: [
            ...this.state.doctorListOfPatientsEncryptedPassphrases,
            encryptedPassphrase
          ]
        });
      }

      // Fetching all the file hashes for a patient from the blockchain
      const FileHashesCount = await contract.methods
        .getFileHashesCount(this.state.account)
        .call();
      const patient_fileHashes = await contract.methods
        .getPatientFileHashes(this.state.account)
        .call();
      for (i = 0; i < FileHashesCount; i++) {
        this.setState({
          fileHashes: [...this.state.fileHashes, patient_fileHashes[i]]
        });
      }

      // Fetching all the file hashes for each patient who has given medical file access to THIS doctor
      const doctor_ListofPatients = await contract.methods
        .getDoctorListOfPatients(this.state.account)
        .call();
      const PatientsCount = await contract.methods
        .getPatientsCount(this.state.account)
        .call();

      for (i = 0; i < PatientsCount; i++) {
        const patientAccount = doctor_ListofPatients[i];

        if (patientAccount !== "0x0000000000000000000000000000000000000000") {
          const patient_fileHashes_DoctorView = await contract.methods
            .getPatientFileHashes(patientAccount)
            .call();

          this.setState({
            fileHashesDoctorView: [
              ...this.state.fileHashesDoctorView,
              {
                patientAddress: patientAccount,
                hashList: patient_fileHashes_DoctorView
              }
            ]
          });
        }
      }

      // Fetching the list of doctors with access to the medical files of a patient from the blockchain
      const DoctorsCount = await contract.methods
        .getDoctorsCount(this.state.account)
        .call();

      const patient_ListofDoctors = await contract.methods
        .getPatientListOfDoctors(this.state.account)
        .call();
      for (i = 0; i < DoctorsCount; i++) {
        if (
          patient_ListofDoctors[i] !==
          "0x0000000000000000000000000000000000000000"
        ) {
          const doctorAddress = patient_ListofDoctors[i];

          this.setState({
            doctorAddresses: [...this.state.doctorAddresses, doctorAddress]
          });
        }
      }

      // Determining whether the account is a doctor , a patient, or neither
      const IsPatientResult = await contract.methods
        .IsRegisteredPatient(this.state.account)
        .call();
      console.log("IsPatientResult ................");
      console.log(IsPatientResult);
      this.setState({
        IsPatient: IsPatientResult
      });

      const IsDoctorResult = await contract.methods
        .IsRegisteredDoctor(this.state.account)
        .call();
      console.log("IsDoctorResult ................");
      console.log(IsDoctorResult);
      this.setState({
        IsDoctor: IsDoctorResult
      });
    } else {
      window.alert("The contract is not found in your blockchain.");
    }
  }

  constructor(props) {
    super(props);
    // Setting the account (1)
    this.state = {
      account: null,
      fileHashes: [], // let fileHashes be an array of obects holding all the file hashed returned from IPFS. Each object has two keys: account and hash
      fileHashesDoctorView: [],
      patientFileHashList: [],
      doctorAddresses: [],
      IsPatient: false,
      IsDoctor: false,
      contract: null,
      buffer: null,
      userPassphrase: "", // the user's secret key
      doctorListOfPatientsEncryptedPassphrases: [],
      encrpytedPrivateKeyHash: ""
    };
  }

  // Setting the buffer
  setBuffer = data => {
    this.setState({ buffer: data });
    console.log("buffer data", this.state.buffer);
  };

  // Storing/adding the file hash on the blockchain
  storeFileHash = async hash => {
    const gasAmount = await this.state.contract.methods
      .addFileHash(this.state.account, hash)
      .estimateGas({ from: this.state.account });

    this.state.contract.methods
      .addFileHash(this.state.account, hash)
      .send({ from: this.state.account, gas: gasAmount })
      .then(r => {
        return this.setState({
          fileHashes: [...this.state.fileHashes, hash]
        });
      });
  };

  // Grant a doctor access to your medical files
  grantAccessToDoctor = async (doctorAddress, encryptedPassphrase) => {
    const iv = encryptedPassphrase.iv;
    const ephemPublicKey = encryptedPassphrase.ephemPublicKey;
    const ciphertext = encryptedPassphrase.ciphertext;
    const mac = encryptedPassphrase.mac;

    console.log("Doctor address: ", doctorAddress);
    console.log("Encrypted passphrase: ", encryptedPassphrase);
    console.log(" iv : ", iv);
    console.log("ephemPublicKey: ", ephemPublicKey);
    console.log("ciphertext: ", ciphertext);
    console.log("mac: ", mac);

    const gasAmount = await this.state.contract.methods
      .grantAccessToDoctor(doctorAddress, iv, ephemPublicKey, ciphertext, mac)
      .estimateGas({ from: this.state.account });

    this.state.contract.methods
      .grantAccessToDoctor(doctorAddress, iv, ephemPublicKey, ciphertext, mac)
      .send({ from: this.state.account, gas: gasAmount })
      .then(r => {
        return this.setState({
          doctorAddresses: [...this.state.doctorAddresses, doctorAddress]
        });
      });
  };

  // Revoke a doctor's access to the medical files of a patient
  revokeAccessFromDoctor = async doctorAddress => {
    const gasAmount = await this.state.contract.methods
      .revokeAccessFromDoctor(doctorAddress)
      .estimateGas({ from: this.state.account });

    this.state.contract.methods
      .revokeAccessFromDoctor(doctorAddress)
      .send({ from: this.state.account, gas: gasAmount })
      .then(r => {
        return this.setState({
          doctorAddresses: [
            ...this.state.doctorAddresses.filter(
              doctorAccount => doctorAccount !== doctorAddress
            )
          ]
        });
      });
  };

  // Registering a doctor
  registerDoctor = async (doctorAddress, hash) => {
    const gasAmount = await this.state.contract.methods
      .registerDoctor(doctorAddress, hash)
      .estimateGas({ from: this.state.account });

    this.state.contract.methods
      .registerDoctor(doctorAddress, hash)
      .send({ from: this.state.account, gas: gasAmount })
      .then(r => {
        console.log("The doctor has been registerd succesfully ........");
        return this.setState({
          IsDoctor: true,
          IsPatient: false
        });
      });
  };

  // Registering a patient
  registerPatient = async (patientAddress, hash) => {
    const gasAmount = await this.state.contract.methods
      .registerPatient(patientAddress, hash)
      .estimateGas({ from: this.state.account });

    this.state.contract.methods
      .registerPatient(patientAddress, hash)
      .send({ from: this.state.account, gas: gasAmount })
      .then(r => {
        console.log("The patient has been registerd succesfully ........");
        return this.setState({
          IsPatient: true,
          IsDoctor: false
        });
      });
  };

  render() {
    return (
      <div className="container">
        <div>
          <Addressbar account={this.state.account} />
        </div>

        <div>
          {this.state.IsDoctor !== true && this.state.IsPatient !== true ? (
            <div>
              <Registration
                account={this.state.account}
                registerDoctor={this.registerDoctor}
                registerPatient={this.registerPatient}
              />
            </div>
          ) : (
            <div>
              {this.state.IsDoctor === true ? (
                <div>
                  <DoctorView
                    fileHashesDoctorView={this.state.fileHashesDoctorView}
                    account={this.state.account}
                    doctorListOfPatientsEncryptedPassphrases={
                      this.state.doctorListOfPatientsEncryptedPassphrases
                    }
                    encrpytedPrivateKeyHash={this.state.encrpytedPrivateKeyHash}
                    userPassphrase={this.state.userPassphrase}
                  />
                </div>
              ) : (
                <div>
                  <Main //  It is for the patient view
                    fileHashes={this.state.fileHashes}
                    setBuffer={this.setBuffer}
                    buffer={this.state.buffer}
                    storeFileHash={this.storeFileHash}
                    account={this.state.account}
                    userPassphrase={this.state.userPassphrase}
                    doctorAddresses={this.state.doctorAddresses}
                    grantAccessToDoctor={this.grantAccessToDoctor}
                    revokeAccessFromDoctor={this.revokeAccessFromDoctor}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default App;
