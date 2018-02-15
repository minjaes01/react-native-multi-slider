import React from 'react';
import PropTypes from 'prop-types';

import { StyleSheet, PanResponder, View, TouchableHighlight, Platform } from 'react-native';

import DefaultMarker from './DefaultMarker';
import { createArray, valueToPosition, positionToValue } from './converters';

const ViewPropTypes = require('react-native').ViewPropTypes || View.propTypes;

export default class MultiSlider extends React.Component {
  static propTypes = {
    values: PropTypes.arrayOf(PropTypes.number),

    onValuesChangeStart: PropTypes.func,
    onValuesChange: PropTypes.func,
    onValuesChangeFinish: PropTypes.func,

    sliderLength: PropTypes.number,
    touchDimensions: PropTypes.object,

    customMarker: PropTypes.func,

    min: PropTypes.number,
    max: PropTypes.number,
    step: PropTypes.number,

    optionsArray: PropTypes.array,

    containerStyle: ViewPropTypes.style,
    trackStyle: ViewPropTypes.style,
    selectedStyle: ViewPropTypes.style,
    unselectedStyle: ViewPropTypes.style,
    markerContainerStyle: ViewPropTypes.style,
    markerStyle: ViewPropTypes.style,
    pressedMarkerStyle: ViewPropTypes.style,
    valuePrefix: PropTypes.string,
    valueSuffix: PropTypes.string,
    enabledOne: PropTypes.bool,
    enabledTwo: PropTypes.bool,
    onToggleOne: PropTypes.func,
    onToggleTwo: PropTypes.func,
    allowOverlap: PropTypes.bool,
    snapped: PropTypes.bool,
    markerOffsetX: PropTypes.number,
    markerOffsetY: PropTypes.number,
  };

  static defaultProps = {
    values: [0],
    onValuesChangeStart: () => {},
    onValuesChange: values => {},
    onValuesChangeFinish: values => {},
    step: 1,
    min: 0,
    max: 10,
    touchDimensions: {
      height: 50,
      width: 50,
      borderRadius: 15,
      slipDisplacement: 200,
    },
    customMarker: DefaultMarker,
    markerOffsetX: 0,
    markerOffsetY: 0,
    sliderLength: 280,
    onToggleOne: undefined,
    onToggleTwo: undefined,
    enabledOne: true,
    enabledTwo: true,
    allowOverlap: false,
    snapped: false,
  };

  constructor(props) {
    super(props);

    this.optionsArray =
      this.props.optionsArray || createArray(this.props.min, this.props.max, this.props.step);
    this.stepLength = this.props.sliderLength / this.optionsArray.length;

    var initialValues = this.props.values.map(value =>
      valueToPosition(value, this.optionsArray, this.props.sliderLength),
    );

    this.state = {
      pressedOne: true,
      valueOne: this.props.values[0],
      valueTwo: this.props.values[1],
      pastOne: initialValues[0],
      pastTwo: initialValues[1],
      positionOne: initialValues[0],
      positionTwo: initialValues[1],
    };
  }

  componentWillMount() {
    var customPanResponder = (start, move, end) => {
      return PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderGrant: (evt, gestureState) => start(),
        onPanResponderMove: (evt, gestureState) => move(gestureState),
        onPanResponderTerminationRequest: (evt, gestureState) => true,
        onPanResponderRelease: (evt, gestureState) => end(gestureState),
        onPanResponderTerminate: (evt, gestureState) => end(gestureState),
        onShouldBlockNativeResponder: (evt, gestureState) => true,
      });
    };

    this._panResponderOne = customPanResponder(this.startOne, this.moveOne, this.endOne);
    this._panResponderTwo = customPanResponder(this.startTwo, this.moveTwo, this.endTwo);
    this._panResponderMiddle = customPanResponder(this.startBoth, this.moveBoth, this.endBoth);
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.onePressed || this.state.twoPressed) {
      return;
    }

    let nextState = {};
    if (
      nextProps.min !== this.props.min ||
      nextProps.max !== this.props.max ||
      nextProps.values[0] !== this.state.valueOne ||
      nextProps.sliderLength !== this.props.sliderLength ||
      nextProps.values[1] !== this.state.valueTwo ||
      (nextProps.sliderLength !== this.props.sliderLength && nextProps.values[1])
    ) {
      this.optionsArray =
        this.props.optionsArray || createArray(nextProps.min, nextProps.max, nextProps.step);

      this.stepLength = this.props.sliderLength / this.optionsArray.length;

      positionOne = valueToPosition(nextProps.values[0], this.optionsArray, nextProps.sliderLength);
      nextState.valueOne = nextProps.values[0];
      nextState.pastOne = positionOne;
      nextState.positionOne = positionOne;

      positionTwo = valueToPosition(nextProps.values[1], this.optionsArray, nextProps.sliderLength);
      nextState.valueTwo = nextProps.values[1];
      nextState.pastTwo = positionTwo;
      nextState.positionTwo = positionTwo;
    }

    if (nextState != {}) {
      this.setState(nextState);
    }
  }

  startOne = () => {
    if (this.props.enabledOne) {
      this.props.onValuesChangeStart();
      this.setState({
        onePressed: !this.state.onePressed,
      });
    }
  };

  startTwo = () => {
    if (this.props.enabledTwo) {
      this.props.onValuesChangeStart();
      this.setState({
        twoPressed: !this.state.twoPressed,
      });
    }
  };

  startBoth = () => {
    if (this.props.enabledOne && this.props.enabledTwo) {
      this.props.onValuesChangeStart();
      this.setState({
        onePressed: !this.state.onePressed,
        twoPressed: !this.state.twoPressed,
      });
    }
  };

  moveOne = gestureState => {
    if (!this.props.enabledOne) {
      return;
    }

    var unconfined = gestureState.dx + this.state.pastOne;
    var pastTwo = this.state.pastTwo;
    var bottom = 0;
    var trueTop = this.state.positionTwo - (this.props.allowOverlap ? 0 : this.stepLength);
    var top = trueTop === 0 ? 0 : trueTop || this.props.sliderLength;
    var confined = unconfined < bottom ? bottom : unconfined > top ? top : unconfined;
    var slipDisplacement = this.props.touchDimensions.slipDisplacement;

    var value = positionToValue(confined, this.optionsArray, this.props.sliderLength);
    var valueTwo = positionToValue(pastTwo, this.optionsArray, this.props.sliderLength);

    const diff = valueTwo - value;
    if (
      this.props.enabledTwo &&
      ((diff < 2 && gestureState.dx > 0) || (diff > 6 && gestureState.dx < 0))
    ) {
      return;
    }

    if (Math.abs(gestureState.dy) < slipDisplacement || !slipDisplacement) {
      var snapped = valueToPosition(value, this.optionsArray, this.props.sliderLength);
      this.setState({
        positionOne: this.props.snapped ? snapped : confined,
      });

      if (value !== this.state.valueOne) {
        this.setState(
          {
            valueOne: value,
          },
          () => {
            var change = [this.state.valueOne];
            if (this.state.valueTwo) {
              change.push(this.state.valueTwo);
            }
            this.props.onValuesChange(change);
          },
        );
      }
    }
  };

  moveTwo = gestureState => {
    if (!this.props.enabledTwo) {
      return;
    }

    var unconfined = gestureState.dx + this.state.pastTwo;
    var pastOne = this.state.pastOne;
    var bottom = this.state.positionOne + (this.props.allowOverlap ? 0 : this.stepLength);
    var top = this.props.sliderLength;
    var confined = unconfined < bottom ? bottom : unconfined > top ? top : unconfined;
    var slipDisplacement = this.props.touchDimensions.slipDisplacement;

    var value = positionToValue(confined, this.optionsArray, this.props.sliderLength);
    var valueOne = positionToValue(pastOne, this.optionsArray, this.props.sliderLength);

    var diff = value - valueOne;

    if ((diff < 2 && gestureState.dx < 0) || (diff > 6 && gestureState.dx > 0)) {
      return;
    }

    if (Math.abs(gestureState.dy) < slipDisplacement || !slipDisplacement) {
      var snapped = valueToPosition(value, this.optionsArray, this.props.sliderLength);

      this.setState({
        positionTwo: this.props.snapped ? snapped : confined,
      });

      if (value !== this.state.valueTwo) {
        this.setState(
          {
            valueTwo: value,
          },
          () => {
            this.props.onValuesChange([this.state.valueOne, this.state.valueTwo]);
          },
        );
      }
    }
  };

  moveBoth = gestureState => {
    if (!this.props.enabledOne || !this.props.enabledTwo) {
      return;
    }

    var newOne = gestureState.dx + this.state.pastOne;
    var newTwo = gestureState.dx + this.state.pastTwo;
    var slipDisplacement = this.props.touchDimensions.slipDisplacement;

    if (newOne < 0 || newTwo > this.props.sliderLength) {
      return;
    }
    if (Math.abs(gestureState.dy) < slipDisplacement || !slipDisplacement) {
      var valueOne = positionToValue(newOne, this.optionsArray, this.props.sliderLength);
      var valueTwo = positionToValue(newTwo, this.optionsArray, this.props.sliderLength);

      var snappedOne = valueToPosition(valueOne, this.optionsArray, this.props.sliderLength);
      var snappedTwo = valueToPosition(valueTwo, this.optionsArray, this.props.sliderLength);

      this.setState({
        positionOne: this.props.snapped ? snappedOne : newOne,
        positionTwo: this.props.snapped ? snappedTwo : newTwo,
      });
      if (valueOne !== this.state.valueOne && valueTwo !== this.state.valueTwo) {
        this.setState({ valueTwo: valueTwo, valueOne: valueOne }, () => {
          this.props.onValuesChange([this.state.valueOne, this.state.valueTwo]);
        });
      }
    }
  };

  endOne = gestureState => {
    if (gestureState.moveX === 0 && this.props.onToggleOne) {
      this.props.onToggleOne();
      return;
    }

    this.setState(
      {
        pastOne: this.state.positionOne,
        onePressed: !this.state.onePressed,
      },
      () => {
        var change = [this.state.valueOne];
        if (this.state.valueTwo) {
          change.push(this.state.valueTwo);
        }
        this.props.onValuesChangeFinish(change);
      },
    );
  };

  endTwo = gestureState => {
    if (gestureState.moveX === 0 && this.props.onToggleTwo) {
      this.props.onToggleTwo();
      return;
    }

    this.setState(
      {
        twoPressed: !this.state.twoPressed,
        pastTwo: this.state.positionTwo,
      },
      () => {
        this.props.onValuesChangeFinish([this.state.valueOne, this.state.valueTwo]);
      },
    );
  };

  endBoth = gestureState => {
    if (gestureState.moveX === 0 && this.props.onToggleTwo && this.onToggleOne) {
      this.props.onToggleOne();
      this.props.onToggleTwo();
      return;
    }

    this.setState(
      {
        pastOne: this.state.positionOne,
        pastTwo: this.state.positionTwo,
        onePressed: !this.state.onePressed,
        twoPressed: !this.state.twoPressed,
      },
      () => {
        var change = [this.state.valueOne];
        if (this.state.valueTwo) {
          change.push(this.state.valueTwo);
        }
        this.props.onValuesChangeFinish(change);
      },
    );
  };

  render() {
    const { positionOne, positionTwo } = this.state;
    const {
      selectedStyle,
      unselectedStyle,
      sliderLength,
      markerOffsetX,
      markerOffsetY,
    } = this.props;
    const twoMarkers = this.props.values.length == 2; // when allowOverlap, positionTwo could be 0, identified as string '0' and throwing 'RawText 0 needs to be wrapped in <Text>' error

    const trackOneLength = positionOne;
    const trackOneStyle = twoMarkers ? unselectedStyle : selectedStyle || styles.selectedTrack;
    const trackThreeLength = twoMarkers ? sliderLength - positionTwo : 0;
    const trackThreeStyle = unselectedStyle;
    const trackTwoLength = sliderLength - trackOneLength - trackThreeLength;
    const trackTwoStyle = twoMarkers ? selectedStyle || styles.selectedTrack : unselectedStyle;
    const Marker = this.props.customMarker;
    const { slipDisplacement, height, width, borderRadius } = this.props.touchDimensions;
    const touchStyle = {
      ...this.props.touchDimensions,
    };

    const touchMiddleStyle = {
      height,
      left: 0,
      right: 0,
      position: 'absolute',
    };

    const markerContainerOne = {
      alignItems: 'center',
      top: markerOffsetY - 12,
      justifyContent: 'center',
      left: trackOneLength + markerOffsetX - 24,
    };

    const markerContainerTwo = {
      top: markerOffsetY - 12,
      right: trackThreeLength + markerOffsetX - 24,
    };

    const markerContainerMiddle = {
      top: markerOffsetY - 12,
      left: trackOneLength + markerOffsetX,
      width: trackTwoLength,
    };

    return (
      <View style={[styles.container, this.props.containerStyle]}>
        <View style={[styles.fullTrack, { width: sliderLength }]}>
          <View
            style={[styles.track, this.props.trackStyle, trackOneStyle, { width: trackOneLength }]}
          />
          <View
            style={[styles.track, this.props.trackStyle, trackTwoStyle, { width: trackTwoLength }]}
          />
          {twoMarkers && (
            <View
              style={[
                styles.track,
                this.props.trackStyle,
                trackThreeStyle,
                { width: trackThreeLength },
              ]}
            />
          )}

          {twoMarkers && (
            <View
              style={[
                styles.markerContainer,
                markerContainerMiddle,
                this.props.markerContainerStyle,
              ]}
            >
              <View
                style={[styles.touch, touchMiddleStyle]}
                ref={component => (this._markerMiddle = component)}
                {...this._panResponderMiddle.panHandlers}
              />
            </View>
          )}
          <View
            style={[
              styles.markerContainer,
              markerContainerOne,
              this.props.markerContainerStyle,
              positionOne > sliderLength / 2 && styles.topMarkerContainer,
            ]}
          >
            <View
              style={[styles.touch, touchStyle]}
              ref={component => (this._markerOne = component)}
              {...this._panResponderOne.panHandlers}
            >
              <Marker
                enabled={this.props.enabledOne}
                pressed={this.state.onePressed}
                markerStyle={[styles.marker, this.props.markerStyle]}
                pressedMarkerStyle={this.props.pressedMarkerStyle}
                currentValue={this.state.valueOne}
                valuePrefix={this.props.valuePrefix}
                valueSuffix={this.props.valueSuffix}
              />
            </View>
          </View>
          {twoMarkers &&
            positionOne !== this.props.sliderLength && (
              <View
                style={[
                  styles.markerContainer,
                  markerContainerTwo,
                  this.props.markerContainerStyle,
                ]}
              >
                <View
                  style={[styles.touch, touchStyle]}
                  ref={component => (this._markerTwo = component)}
                  {...this._panResponderTwo.panHandlers}
                >
                  <Marker
                    pressed={this.state.twoPressed}
                    markerStyle={this.props.markerStyle}
                    pressedMarkerStyle={this.props.pressedMarkerStyle}
                    currentValue={this.state.valueTwo}
                    enabled={this.props.enabledTwo}
                    valuePrefix={this.props.valuePrefix}
                    valueSuffix={this.props.valueSuffix}
                  />
                </View>
              </View>
            )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 50,
  },
  fullTrack: {
    flexDirection: 'row',
  },
  track: {
    ...Platform.select({
      ios: {
        height: 2,
        borderRadius: 2,
        backgroundColor: '#A7A7A7',
      },
      android: {
        height: 2,
        backgroundColor: '#CECECE',
      },
    }),
  },
  selectedTrack: {
    ...Platform.select({
      ios: {
        backgroundColor: '#095FFF',
      },
      android: {
        backgroundColor: '#0D8675',
      },
    }),
  },
  markerContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topMarkerContainer: {
    zIndex: 1,
  },
  touch: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
});
