import React, { Component } from "react";
//Required module(s)
const ipfsAPI = require("ipfs-api");
//Connceting to the ipfs network via infura gateway
const ipfs = ipfsAPI("ipfs.infura.io", "5001", { protocol: "https" });

export class Registration extends Component {
  state = {
    userType: ""
  };

  onChange = e => this.setState({ userType: e.target.value });

  registerDoctor = async (userAddress, hash) => {
    await this.props.registerDoctor(userAddress, hash);
    this.setState({ userType: "" });
  }; // End of the registerDoctor function

  registerPatient = async (userAddress, hash) => {
    await this.props.registerPatient(userAddress, hash);
    this.setState({ userType: "" });
  }; // End of the registerPatient function

  render() {
    return (
      <div className="container-fluid mt-5">
        <div className="row">
          <main>
            <div>
              <h5>Please register as a user</h5>
              <form
                onSubmit={async event => {
                  event.preventDefault();
                  const userAddress = this.userAddress.value;
                  const _userTpye = this.state.userType;
                  const userEncryptedPrivateKey = this.userEncryptedPrivateKey
                    .value;

                  if (_userTpye === "") {
                    alert(" Please select a user type!");
                  } else if (_userTpye === "Doctor") {
                    console.log("Doctor .........");
                    // Storing the doctor's encrypted private key on IPFS
                    ipfs.files.add(
                      Buffer(userEncryptedPrivateKey),
                      (error, result) => {
                        if (error) {
                          console.log(error);
                          return;
                        }
                        console.log(
                          "The doctor's encrypted private key added succesfully"
                        );
                        console.log("IPFS result", result);
                        // Regsitering the doctor and storing the hash returned from IPFS on the blockchain
                        const hash = result[0].hash;
                        this.registerDoctor(userAddress, hash);
                      }
                    );
                  } else {
                    console.log("Patient ..........");
                    // Storing the patient's encrypted private key on IPFS.
                    ipfs.files.add(
                      Buffer(userEncryptedPrivateKey),
                      (error, result) => {
                        if (error) {
                          console.log(error);
                          return;
                        }
                        console.log(
                          "The patient's encrypted private key added succesfully"
                        );
                        console.log("IPFS result", result);
                        // Regsitering the patient and storing the hash returned from IPFS on the blockchain
                        const hash = result[0].hash;
                        this.registerPatient(userAddress, hash);
                      }
                    );
                  }
                }}
              >
                <div className="form-group mr-sm-2">
                  <input
                    id="userAddress"
                    type="text"
                    ref={input => {
                      this.userAddress = input;
                    }}
                    className="form-control"
                    placeholder="Enter your account address"
                    required
                  />
                </div>

                <div className="form-group mr-sm-2">
                  <input
                    id="userEncryptedPrivateKey"
                    type="text"
                    ref={input => {
                      this.userEncryptedPrivateKey = input;
                    }}
                    className="form-control"
                    placeholder="Enter your encrypted private key"
                    required
                  />
                </div>

                <div className="form-group mr-sm-2">
                  <div>
                    <label> User Type: </label>
                  </div>

                  <select id="users" onChange={this.onChange}>
                    <option value="">Please select</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Patient">Patient</option>
                  </select>
                </div>

                <div>
                  <button type="submit" className="btn btn-primary">
                    Register
                  </button>
                </div>
              </form>
            </div>
            <hr></hr>
          </main>
        </div>
      </div>
    );
  }
}

export default Registration;
