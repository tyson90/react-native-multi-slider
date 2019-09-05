import React from 'react';
import PropTypes from 'prop-types';

import {
  StyleSheet,
  PanResponder,
  View,
  TouchableHighlight,
  Platform,
  I18nManager,
} from 'react-native';

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

    customMarkerLeft: PropTypes.func,
    customMarkerRight: PropTypes.func,
    isMarkersSeparated: PropTypes.bool,

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
      borderRadius: 15,
      slipDisplacement: 200,
    },
    customMarker: DefaultMarker,

    customMarkerLeft: DefaultMarker,
    customMarkerRight: DefaultMarker,

    markerOffsetX: 0,
    markerOffsetY: 0,
    sliderLength: 280,
    onToggleOne: undefined,
    onToggleTwo: undefined,
    enabledOne: true,
    enabledTwo: true,
    allowOverlap: false,
    snapped: false,
    vertical: false,
  };

  constructor(props) {
    super(props);

    this.optionsArray =
      this.props.optionsArray ||
      createArray(this.props.min, this.props.max, this.props.step);
    this.stepLength = this.props.sliderLength / this.optionsArray.length;

    this.trackHeight = this.props.trackStyle.height || 2;

    const initialValues = this.props.values.map(value =>
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
      markerOneWidth: 0,
      markerTwoWidth: 0,
      markerOneHeight: 0,
      markerTwoHeight: 0,
      sliderAvailableSize: this.props.sliderLength,
    };
  }

  componentWillMount() {
    const customPanResponder = (start, move, end) =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderGrant: (evt, gestureState) => start(),
        onPanResponderMove: (evt, gestureState) => move(gestureState),
        onPanResponderTerminationRequest: (evt, gestureState) => false,
        onPanResponderRelease: (evt, gestureState) => end(gestureState),
        onPanResponderTerminate: (evt, gestureState) => end(gestureState),
        onShouldBlockNativeResponder: (evt, gestureState) => true,
      });

    this._panResponderOne = customPanResponder(
      this.startOne,
      this.moveOne,
      this.endOne,
    );
    this._panResponderTwo = customPanResponder(
      this.startTwo,
      this.moveTwo,
      this.endTwo,
    );
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.onePressed || this.state.twoPressed) {
      return;
    }

    const nextState = {};
    if (
      nextProps.step !== this.props.step ||
      nextProps.min !== this.props.min ||
      nextProps.max !== this.props.max ||
      nextProps.values[0] !== this.state.valueOne ||
      nextProps.sliderLength !== this.props.sliderLength ||
      nextProps.values[1] !== this.state.valueTwo ||
      (nextProps.sliderLength !== this.props.sliderLength &&
        nextProps.values[1])
    ) {
      this.optionsArray =
        this.props.optionsArray ||
        createArray(nextProps.min, nextProps.max, nextProps.step);

      const positionOne = valueToPosition(
        nextProps.values[0],
        this.optionsArray,
        nextProps.sliderLength,
      );

      nextState.valueOne = nextProps.values[0];
      nextState.pastOne = positionOne;
      nextState.positionOne = positionOne;

      const positionTwo = valueToPosition(
        nextProps.values[1],
        this.optionsArray,
        nextProps.sliderLength,
      );
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

  moveOne = gestureState => {
    const twoMarkers = this.props.values.length === 2;
    const safePositionOne =
      this.state.positionTwo -
      (this.state.markerOneWidth + this.state.markerTwoWidth);
    const collision = this.state.positionOne >= safePositionOne;
    const unconfined = I18nManager.isRTL
      ? this.state.pastOne - gestureState.dx
      : gestureState.dx + this.state.pastOne;
    const bottom = 0;
    const trueTop =
      this.state.positionTwo - this.state.sliderUnavailableLength - (this.props.allowOverlap ? 0 : this.stepLength);
    const top = trueTop === 0 ? 0 : trueTop || this.state.sliderAvailableSize;
    const confined =
      unconfined < bottom ? bottom : unconfined > top ? top : unconfined;
    const slipDisplacement = this.props.touchDimensions.slipDisplacement;

    // disabled marker one
    if (!this.props.enabledOne) {
      return;
    }

    // prevent overlapping two markers once there can be
    // a collision between them and gesture is performed
    // to the right side
    if (twoMarkers && collision && gestureState.dx > 0) {
      this.setState(
        {
          positionOne: safePositionOne,
          valueOne: positionToValue(
            safePositionOne,
            this.optionsArray,
            this.state.sliderAvailableSize,
          ),
        },
        () => {
          if (this.props.snapped) {
            const change = [this.state.valueOne];
            if (this.state.valueTwo) {
              change.push(this.state.valueTwo);
            }
            this.props.onValuesChange(change);
          }
        },
      );
      return;
    }

    // regular marker movement
    if (Math.abs(gestureState.dy) < slipDisplacement || !slipDisplacement) {
      const value = positionToValue(
        confined,
        this.optionsArray,
        this.state.sliderAvailableSize,
      );
      const snapped = valueToPosition(
        value,
        this.optionsArray,
        this.props.sliderLength,
      );

      this.setState({
        positionOne: this.props.snapped ? snapped : confined,
      });

      if (value !== this.state.valueOne) {
        this.setState(
          {
            valueOne: value,
          },
          () => {
            const change = [this.state.valueOne];
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
    const safePositionTwo =
      this.state.positionOne +
      (this.state.markerOneWidth + this.state.markerTwoWidth) + (this.props.allowOverlap ? 0 : this.stepLength);
    const collision = this.state.positionTwo <= safePositionTwo;
    const unconfined = I18nManager.isRTL
      ? this.state.pastTwo - gestureState.dx
      : gestureState.dx + this.state.pastTwo;
    const bottom =
      this.state.positionOne + (this.props.allowOverlap ? 0 : this.stepLength);
    const top = this.props.sliderLength;
    const confined =
      unconfined < bottom ? bottom : unconfined > top ? top : unconfined;
    const slipDisplacement = this.props.touchDimensions.slipDisplacement;

    // disabled marker two
    if (!this.props.enabledTwo) {
      return;
    }

    // prevent overlapping two markers once there can be
    // a collision between them and gesture is performed
    // to the left side
    if (collision && gestureState.dx < 0) {
      this.setState(
        {
          positionTwo: safePositionTwo,
          valueTwo: positionToValue(
            safePositionTwo - this.state.sliderUnavailableLength,
            this.optionsArray,
            this.state.sliderAvailableSize,
          ),
        },
        () => {
          this.props.onValuesChange([this.state.valueOne, this.state.valueTwo]);
        },
      );
      return;
    }

    // regular marker movement
    if (Math.abs(gestureState.dy) < slipDisplacement || !slipDisplacement) {
      const value = positionToValue(
        confined - this.state.sliderUnavailableLength,
        this.optionsArray,
        this.state.sliderAvailableSize,
      );
      const snapped = valueToPosition(
        value,
        this.optionsArray,
        this.props.sliderLength,
      );

      this.setState({
        positionTwo: this.props.snapped ? snapped : confined,
      });

      if (value !== this.state.valueTwo) {
        this.setState(
          {
            valueTwo: value,
          },
          () => {
            this.props.onValuesChange([
              this.state.valueOne,
              this.state.valueTwo,
            ]);
          },
        );
      }
    }
  };

  endOne = gestureState => {
    const twoMarkers = this.props.values.length === 2;
    const safePositionOne =
      this.state.positionTwo -
      (this.state.markerOneWidth + this.state.markerTwoWidth);
    const collision = this.state.positionOne >= safePositionOne;
    const equalValues = this.state.valueOne === this.state.valueTwo;

    if (gestureState.moveX === 0 && this.props.onToggleOne) {
      this.props.onToggleOne();
      return;
    }

    if (twoMarkers && collision && gestureState.dx > 0) {
      this.setState(
        {
          positionOne: this.props.snapped
            ? valueToPosition(
                this.state.valueOne,
                this.optionsArray,
                this.props.sliderLength,
              )
            : safePositionOne,
          valueOne: positionToValue(
            safePositionOne,
            this.optionsArray,
            this.state.sliderAvailableSize,
          ),
        },
        () => {
          if (this.props.snapped || !equalValues) {
            const change = [this.state.valueOne];
            if (this.state.valueTwo) {
              change.push(this.state.valueTwo);
            }
            this.props.onValuesChange(change);
          }
        },
      );
    }

    this.setState(
      {
        pastOne: this.state.positionOne,
        onePressed: !this.state.onePressed,
      },
      () => {
        const change = [this.state.valueOne];
        if (this.state.valueTwo) {
          change.push(this.state.valueTwo);
        }
        this.props.onValuesChangeFinish(change);
      },
    );
  };

  endTwo = gestureState => {
    const safePositionTwo =
      this.state.positionOne +
      (this.state.markerOneWidth + this.state.markerTwoWidth);
    const collision = this.state.positionTwo <= safePositionTwo;

    if (gestureState.moveX === 0 && this.props.onToggleTwo) {
      this.props.onToggleTwo();
      return;
    }

    if (collision && gestureState.dx < 0 && this.props.snapped) {
      const newPositionTwo = valueToPosition(
        this.state.valueTwo + this.props.step,
        this.optionsArray,
        this.props.sliderLength,
      );

      this.setState(
        {
          twoPressed: !this.state.twoPressed,
          positionTwo: newPositionTwo,
          pastTwo: newPositionTwo,
          valueTwo: this.state.valueTwo + this.props.step,
        },
        () => {
          this.props.onValuesChange([this.state.valueOne, this.state.valueTwo]);
        },
      );
      return;
    }

    if (collision && gestureState.dx < 0) {
      this.setState(
        {
          positionTwo: this.props.snapped
            ? valueToPosition(
                this.state.valueTwo,
                this.optionsArray,
                this.props.sliderLength,
              )
            : safePositionTwo,
          valueTwo: positionToValue(
            safePositionTwo - this.state.sliderUnavailableLength,
            this.optionsArray,
            this.state.sliderAvailableSize,
          ),
        },
        () => {
          this.props.onValuesChange([this.state.valueOne, this.state.valueTwo]);
        },
      );
    }

    this.setState(
      {
        twoPressed: !this.state.twoPressed,
        pastTwo: this.state.positionTwo,
      },
      () => {
        this.props.onValuesChangeFinish([
          this.state.valueOne,
          this.state.valueTwo,
        ]);
      },
    );
  };

  measureMarkerOne = ({ nativeEvent }: OnLayout) => {
    this.setState(
      {
        markerOneWidth: nativeEvent.layout.width,
        markerOneHeight: nativeEvent.layout.height,
      },
      () => {
        this.setSliderAvailableSize();
      }
    );
  };

  measureMarkerTwo = ({ nativeEvent }: OnLayout) => {
    this.setState(
      {
        markerTwoWidth: nativeEvent.layout.width,
        markerTwoHeight: nativeEvent.layout.height,
      },
      () => {
        this.setSliderAvailableSize();
      }
    );
  };

  getSliderAvailableSize = props => {
    return (props || this.props).sliderLength - this.state.markerOneWidth - this.state.markerTwoWidth;
  }

  setSliderAvailableSize = () => {
    const sliderAvailableSize = this.getSliderAvailableSize();
    const sliderUnavailableLength = this.props.sliderLength - sliderAvailableSize;
    const positionOne = valueToPosition(
      this.state.valueOne,
      this.optionsArray,
      sliderAvailableSize,
    );
    const positionTwo = sliderUnavailableLength + valueToPosition(
      this.state.valueTwo,
      this.optionsArray,
      sliderAvailableSize,
    );

    if (sliderAvailableSize != this.state.sliderAvailableSize) {
      this.setState({
        sliderAvailableSize,
        sliderUnavailableLength,
        positionOne,
        positionTwo,
        pastOne: positionOne,
        pastTwo: positionTwo,
      });
    }
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
    const trackOneStyle = twoMarkers
      ? unselectedStyle
      : selectedStyle || styles.selectedTrack;
    const trackThreeLength = twoMarkers ? sliderLength - positionTwo : 0;
    const trackThreeStyle = unselectedStyle;
    const trackTwoLength = sliderLength - trackOneLength - trackThreeLength;
    const trackTwoStyle = twoMarkers
      ? selectedStyle || styles.selectedTrack
      : unselectedStyle;
    const Marker = this.props.customMarker;

    const MarkerLeft = this.props.customMarkerLeft;
    const MarkerRight = this.props.customMarkerRight;
    const isMarkersSeparated = this.props.isMarkersSeparated || false;

    const {
      slipDisplacement,
      height,
      width,
      borderRadius,
    } = this.props.touchDimensions;
    const touchStyle = {
      borderRadius: borderRadius || 0,
    };

    const markerContainerOne = {
      top: markerOffsetY + this.trackHeight / 2 - this.state.markerOneHeight / 2,
      left: trackOneLength + markerOffsetX,
    };

    const markerContainerTwo = {
      top: markerOffsetY + this.trackHeight / 2 - this.state.markerTwoHeight / 2,
      right: trackThreeLength + markerOffsetX,
    };

    return (
      <View style={[styles.container, this.props.containerStyle]}>
        <View style={[styles.fullTrack, { width: sliderLength }]}>
          <View
            style={[
              styles.track,
              this.props.trackStyle,
              trackOneStyle,
              { width: trackOneLength },
            ]}
          />
          <View
            style={[
              styles.track,
              this.props.trackStyle,
              trackTwoStyle,
              { width: trackTwoLength },
            ]}
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
              {isMarkersSeparated === false ? (
                <View onLayout={this.measureMarkerOne}>
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
              ) : (
                <View onLayout={this.measureMarkerOne}>
                  <MarkerLeft
                    enabled={this.props.enabledOne}
                    pressed={this.state.onePressed}
                    markerStyle={[styles.marker, this.props.markerStyle]}
                    pressedMarkerStyle={this.props.pressedMarkerStyle}
                    currentValue={this.state.valueOne}
                    valuePrefix={this.props.valuePrefix}
                    valueSuffix={this.props.valueSuffix}
                  />
                </View>
              )}
            </View>
          </View>
          {twoMarkers && positionOne !== this.props.sliderLength && (
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
                {isMarkersSeparated === false ? (
                  <View onLayout={this.measureMarkerTwo}>
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
                ) : (
                  <View onLayout={this.measureMarkerTwo}>
                    <MarkerRight
                      pressed={this.state.twoPressed}
                      markerStyle={this.props.markerStyle}
                      pressedMarkerStyle={this.props.pressedMarkerStyle}
                      currentValue={this.state.valueTwo}
                      enabled={this.props.enabledTwo}
                      valuePrefix={this.props.valuePrefix}
                      valueSuffix={this.props.valueSuffix}
                    />
                  </View>
                )}
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
    justifyContent: 'center',
  },
  fullTrack: {
    flexDirection: 'row',
  },
  track: {
    height: this.trackHeight,
    borderRadius: 2,
    backgroundColor: '#A7A7A7',
  },
  selectedTrack: {
    backgroundColor: '#095FFF',
  },
  markerContainer: {
    position: 'absolute',
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
    alignSelf: 'stretch',
  },
});
