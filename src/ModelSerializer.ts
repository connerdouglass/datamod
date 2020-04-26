import { Model } from './Model';
import { IModel } from './Model.types';
import { Serializer } from './Serializer';

export class ModelSerializer<TObject extends Model = any, TSerialized extends IModel = any, TFlag = string> extends Serializer<TObject, TSerialized, TFlag> {

	protected configure(): void {}

	/**
	 * Serializes the default data for an object
	 * @param object the object to serialize
	 * @param serialized the serialized object to populate to
	 */
	protected serializeDefaultData(object: TObject, serialized: TSerialized): void {
		serialized.id = object.id;
	}

}
