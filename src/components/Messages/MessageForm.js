import React, { Component } from "react";
import { Segment, Button, Input } from "semantic-ui-react";
import firebase from "../../firebase";
import { v4 as uuidv4 } from "uuid";
import { Picker, emojiIndex } from "emoji-mart";
import "emoji-mart/css/emoji-mart.css";

import FileModal from "./FileModal";
import ProgressBar from "./ProgressBar";

export default class MessageForm extends Component {
  state = {
    message: "",
    loading: false,
    channel: this.props.currentChannel,
    user: this.props.currentUser,
    errors: [],
    modal: false,
    uploadState: "",
    uploadTask: null,
    storageRef: firebase.storage().ref(),
    percentUploaded: 0,
    typingRef: firebase.database().ref("typing"),
    emojiPicker: false,
  };
  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  openModal = () => this.setState({ modal: true });
  closeModal = () => this.setState({ modal: false });

  sendMessage = () => {
    const { getMessagesRef } = this.props;
    const { message, channel, typingRef, user } = this.state;

    if (message) {
      this.setState({ loading: true });
      getMessagesRef()
        .child(channel.id)
        .push()
        .set(this.createMessage())
        .then(() => {
          this.setState({ loading: false, message: "", errors: [] });
        })
        .catch((err) => {
          console.log(err);
          this.setState({
            loading: false,
            errors: this.state.errors.concat(err),
          });
          typingRef.child(channel.id).child(user.uid).remove();
        });
    } else {
      this.setState({
        errors: this.state.errors.concat({ message: "Add a message" }),
      });
    }
  };

  createMessage = (fileURL = null) => {
    const message = {
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      user: {
        id: this.state.user.uid,
        name: this.state.user.displayName,
        avatar: this.state.user.photoURL,
      },
      //   content: this.state.message,
    };
    if (fileURL !== null) {
      message["image"] = fileURL;
    } else {
      message["content"] = this.state.message;
    }

    console.log(message);

    return message;
  };

  getPath = () => {
    if (this.props.isPrivateChannel) {
      return `chat/private-${this.state.channel.id}`;
    } else {
      return `chat/public`;
    }
  };
  uploadFile = (file, metadata) => {
    const pathToUpload = this.state.channel.id;
    const ref = this.props.getMessagesRef();
    const filePath = `${this.getPath()}/${uuidv4()}.jpg`;

    this.setState(
      {
        uploadState: "uploading",
        uploadTask: this.state.storageRef.child(filePath).put(file, metadata),
      },
      () => {
        this.state.uploadTask.on(
          "state_changed",
          (snap) => {
            const percentUploaded = Math.round(
              (snap.bytesTransferred / snap.totalBytes) * 100
            );
            this.setState({ percentUploaded });
          },
          (err) => {
            console.error(err);
            this.setState({
              errors: this.state.errors.concat(err),
              uploadState: "error",
              uploadTask: null,
            });
          },
          () => {
            this.state.uploadTask.snapshot.ref
              .getDownloadURL()
              .then((downloadUrl) => {
                this.sendFileMessage(downloadUrl, ref, pathToUpload);
              })
              .catch((err) => {
                console.error(err);
                this.setState({
                  errors: this.state.errors.concat(err),
                  uploadState: "error",
                  uploadTask: null,
                });
              });
          }
        );
      }
    );
  };

  sendFileMessage = (fileUrl, ref, pathToUpload) => {
    ref
      .child(pathToUpload)
      .push()
      .set(this.createMessage(fileUrl))
      .then(() => {
        this.setState({ uploadState: "done" });
      })
      .catch((err) => {
        console.error(err);
        this.setState({
          errors: this.state.errors.concat(err),
        });
      });
  };

  handleKeyDown = (event) => {
    if (event.ctrlKey && event.keyCode === 13) {
      this.sendMessage();
    }
    const { message, typingRef, channel, user } = this.state;

    if (message) {
      typingRef.child(channel.id).child(user.uid).set(user.displayName);
    } else {
      typingRef.child(channel.id).child(user.uid).remove();
    }
  };

  handleTogglePicker = () => {
    this.setState({ emojiPicker: !this.state.emojiPicker });
  };

  handleAddEmoji = (emoji) => {
    const oldMessage = this.state.message;
    const newMessage = this.colonToUnicode(` ${oldMessage} ${emoji.colons} `);
    this.setState({ message: newMessage, emojiPicker: false });
    setTimeout(() => this.messageInputRef.focus(), 0);
  };

  colonToUnicode = (message) => {
    return message.replace(/:[A-Za-z0-9_+-]+:/g, (x) => {
      x = x.replace(/:/g, "");
      let emoji = emojiIndex.emojis[x];
      if (typeof emoji !== "undefined") {
        let unicode = emoji.native;
        if (typeof unicode !== "undefined") {
          return unicode;
        }
      }
      x = ":" + x + ":";
      return x;
    });
  };

  render() {
    const {
      errors,
      message,
      loading,
      modal,
      uploadState,
      percentUploaded,
      emojiPicker,
    } = this.state;
    return (
      <Segment className="message__form">
        {emojiPicker && (
          <Picker
            set="apple"
            onSelect={this.handleAddEmoji}
            className="emojipicker"
            title="Pick your emoji"
            emoji="point_up"
          />
        )}
        <Input
          fluid
          name="message"
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          style={{ marginBottom: "0.7em" }}
          label={
            <Button
              icon={emojiPicker ? "close" : "add"}
              content={emojiPicker ? "close" : null}
              onClick={this.handleTogglePicker}
            />
          }
          labelPosition="left"
          placeholder="Write your message"
          value={message}
          ref={(node) => (this.messageInputRef = node)}
          className={
            errors.some((error) => error.message.includes("message"))
              ? "error"
              : ""
          }
        />
        <Button.Group icon widths="2">
          <Button
            onClick={this.sendMessage}
            color="orange"
            content="Add Reply"
            labelPosition="left"
            icon="edit"
            disabled={loading}
          />
          <Button
            color="teal"
            disabled={uploadState === "uploading"}
            onClick={this.openModal}
            content="Upload Media"
            labelPosition="right"
            icon="cloud upload"
          />
        </Button.Group>
        <FileModal
          modal={modal}
          closeModal={this.closeModal}
          uploadFile={this.uploadFile}
        />
        <ProgressBar
          uploadState={uploadState}
          percentUploaded={percentUploaded}
        />
      </Segment>
    );
  }
}
