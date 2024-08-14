

export default class DmWs {
  tag_ = '[DmWs]';
  text_logger_ = null;
  socket_ = null;

  constructor(text_logger, port = 8887) {
    self.text_logger_ = text_logger;

    var that = this;
    self.socket_ = new WebSocket("wss://192.168.19.234:" + port.toString());
    self.socket_.binaryType = 'arraybuffer';
    self.socket_.onopen = function (evt) { that.onOpen(evt) };
    self.socket_.onclose = function (evt) { that.onClose(evt) };
    self.socket_.onmessage = function (evt) { that.onMessage(evt) };
    self.socket_.onerror = function (evt) { that.onError(evt) };
  }

  onOpen(evt) {
    self.text_logger_.UpdateText("CONNECTED");
  }

  onClose(evt) {
    self.text_logger_.UpdateText("DISCONNECTED");
  }

  onMessage(evt) {
    console.log(evt.data);
    const decoder = new TextDecoder('utf-8');
    const str = decoder.decode(evt.data);
    console.log(str);
    self.text_logger_.UpdateText("receive: " + str);
  }

  onError(evt) {
    console.log("ERROR:" + evt.data);
    self.text_logger_.UpdateText("ERROR: " + evt.data);
  }

}
